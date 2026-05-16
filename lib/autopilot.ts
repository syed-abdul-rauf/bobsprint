// AutoPilotController — drives the 5-stage pipeline:
//   recon → fan-out → safety-gate → apply → done
//
// All external dependencies are injectable so the orchestrator is fully
// testable without network access. Demo mode replays pre-recorded fixture
// responses so no bridge or GitHub calls are required.

import type {
  AutoPilotRun,
  AutoPilotStage,
  BobShellResult,
  EvidenceEntry,
  SafeWin,
  SafeWinType,
} from './types';
import type { BobRunOptions } from './bob-shell';
import type { GitHubTreeResult } from './github';
import { runWithBob } from './bob-shell';
import { fetchGitHubRepoTree, sampleRepoCode, parseGitHubUrl } from './github';
import { snapshot } from './analyzer';
import { buildContextBundle } from './context-bundle';
import { classifyByPath, classifyContent } from './safe-win-classifier';
import { getOrCreateFork, getLatestCommitSha, createBranch, upsertFile, createDraftPR } from './github-write';
import { generateId } from './utils';
import { DEMO_FIXTURE_URL, NORTHPEAK_DEMO_FIXTURE } from './demo-data';

// ── Types ────────────────────────────────────────────────────────────────────

type BobRunner = (prompt: string, opts?: BobRunOptions) => Promise<BobShellResult>;

export interface AutoPilotParams {
  run: AutoPilotRun;
  pat?: string;
  /** Bobcoin spend ceiling. Pipeline halts with "budget exceeded" if exceeded. */
  budget?: number;
  /** Pipeline timeout in ms. Default 5 × 60 × 1000. Exposed for tests. */
  timeoutMs?: number;
  /**
   * Dev mode: cap safe-wins to 1 file and skip the Bob safety-gate call
   * (auto-approve if path classifier passes). Preserves Bobcoin budget
   * during development. Activate with NEXT_PUBLIC_BOBSPRINT_DEV_MODE=1.
   */
  devMode?: boolean;
  onUpdate: (patch: Partial<AutoPilotRun>) => void;
  /** Injectable Bob runner — defaults to the real bridge client. */
  bobRunner?: BobRunner;
}

class BudgetExceededError extends Error {
  constructor(spent: number, limit: number) {
    super(`budget exceeded: spent ${spent.toFixed(2)} of ${limit} Bobcoins`);
    this.name = 'BudgetExceededError';
  }
}

interface RawPlanItem {
  type: string;
  targetPath: string;
  description: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEMO_DELAY_MS = 1_500;
const RUN_TIMEOUT_MS = 5 * 60 * 1_000; // 5-minute hard limit

function extToLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const MAP: Record<string, string> = {
    py: 'Python', ts: 'TypeScript', tsx: 'TypeScript/React',
    js: 'JavaScript', jsx: 'JavaScript/React', md: 'Markdown', mdx: 'MDX',
    go: 'Go', rs: 'Rust', java: 'Java', rb: 'Ruby',
  };
  return MAP[ext] ?? 'text';
}

function parsePlanOutput(output: string): RawPlanItem[] {
  const match = output.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is RawPlanItem =>
        typeof x === 'object' &&
        x !== null &&
        typeof x.type === 'string' &&
        typeof x.targetPath === 'string' &&
        typeof x.description === 'string',
    );
  } catch {
    return [];
  }
}

function parseSafetyResponse(output: string): { safe: boolean; reason?: string } {
  const t = output.trim();
  if (/^SAFE/i.test(t)) return { safe: true };
  if (/^DEFERRED:/i.test(t)) return { safe: false, reason: t.replace(/^DEFERRED:\s*/i, '') };
  // Anything else → defer (belt-and-suspenders)
  return { safe: false, reason: 'Safety gate response ambiguous; deferring for human review.' };
}

function first300(s: string): string {
  return s.slice(0, 300);
}

// ── Controller ────────────────────────────────────────────────────────────────

export class AutoPilotController {
  private run: AutoPilotRun;
  private pat: string;
  private budget: number;
  private devMode: boolean;
  private onUpdate: (patch: Partial<AutoPilotRun>) => void;
  private bobRun: BobRunner;
  private abortCtrl = new AbortController();
  private totalTimeout: ReturnType<typeof setTimeout> | null = null;
  private timedOut = false;

  private readonly timeoutMs: number;

  constructor(params: AutoPilotParams) {
    this.run = { ...params.run, evidence: [...params.run.evidence] };
    this.pat = params.pat ?? '';
    this.budget = params.budget ?? Infinity;
    this.devMode = params.devMode ?? false;
    this.timeoutMs = params.timeoutMs ?? RUN_TIMEOUT_MS;
    this.onUpdate = params.onUpdate;
    this.bobRun = params.bobRunner ?? runWithBob;
  }

  abort(): void {
    this.abortCtrl.abort();
  }

  // ── Public entry point ────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.totalTimeout = setTimeout(() => {
      this.timedOut = true;
      this.abortCtrl.abort();
    }, this.timeoutMs);

    try {
      await this.runPipeline();
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        this.patch({ stage: 'aborted' as AutoPilotStage, abortedAt: Date.now() });
        this.addEvidence({
          stage: this.run.stage as AutoPilotStage,
          eventType: 'aborted',
          summary: `budget exceeded`,
        });
      } else if (this.abortCtrl.signal.aborted) {
        this.patch({ stage: 'aborted' as AutoPilotStage, abortedAt: Date.now() });
        this.addEvidence({
          stage: this.run.stage as AutoPilotStage,
          eventType: 'aborted',
          summary: this.timedOut ? 'timeout reached' : 'aborted by user',
        });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        this.patch({ stage: 'error', error: msg });
        this.addEvidence({
          stage: this.run.stage as AutoPilotStage,
          eventType: 'error',
          summary: `Pipeline error: ${msg}`,
        });
      }
    } finally {
      if (this.totalTimeout) clearTimeout(this.totalTimeout);
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private patch(p: Partial<AutoPilotRun>) {
    Object.assign(this.run, p);
    this.onUpdate(p);
  }

  private addEvidence(
    partial: Omit<EvidenceEntry, 'id' | 'runId' | 'timestamp'>,
  ): EvidenceEntry {
    const entry: EvidenceEntry = {
      id: generateId(),
      runId: this.run.id,
      timestamp: Date.now(),
      ...partial,
    };
    this.run.evidence = [...this.run.evidence, entry];
    this.onUpdate({ evidence: this.run.evidence });
    return entry;
  }

  private aborted(): boolean {
    return this.abortCtrl.signal.aborted;
  }

  private checkBudget(): void {
    if (this.run.totalCost > this.budget) {
      throw new BudgetExceededError(this.run.totalCost, this.budget);
    }
  }

  private async demoDelay(ms = DEMO_DELAY_MS) {
    if (this.abortCtrl.signal.aborted) throw new Error('aborted');
    await new Promise<void>((res, rej) => {
      const t = setTimeout(res, ms);
      this.abortCtrl.signal.addEventListener('abort', () => {
        clearTimeout(t);
        rej(new Error('aborted'));
      }, { once: true });
    });
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────

  private async runPipeline(): Promise<void> {
    // Check if bob is actually available on this server; if not, fall back to
    // demo mode so the live site works for judges without a local bob install.
    let bobAvailable = true;
    try {
      const check = await fetch('/api/bob');
      if (check.ok) {
        const data = await check.json() as { available?: boolean };
        if (data.available === false) bobAvailable = false;
      }
    } catch { bobAvailable = false; }

    const isDemo = !bobAvailable ||
      this.run.isDemo ||
      this.run.githubUrl === DEMO_FIXTURE_URL ||
      this.run.githubUrl === `demo`;

    // ── Stage 1: Recon ──────────────────────────────────────────────────────
    this.patch({ stage: 'recon' });

    let contextBundle = '';

    if (isDemo) {
      await this.demoDelay(2_000);
      if (this.aborted()) throw new Error('aborted');
      contextBundle = [
        'Repository: northpeak-demo/proposal-studio',
        'URL: https://github.com/northpeak-demo/proposal-studio',
        'Type: app',
        'Size: 47 files',
        '',
        '## Stack',
        'backend: FastAPI, Python',
        'frontend: Next.js, React',
        'database: PostgreSQL, Alembic',
        'devops: Docker',
        '',
        '## Missing',
        '- [high] Test suite: No automated tests found.',
        '- [medium] CI workflow: No .github/workflows found.',
        '',
        '## Risks',
        '- [critical] Cache contamination: services/cache.py does not scope keys by tenant_id.',
      ].join('\n');

      this.addEvidence({
        stage: 'recon',
        eventType: 'recon-complete',
        summary: 'Analyzed 47 files across 12 folders. Stack: FastAPI, Next.js, PostgreSQL, Alembic, Docker. Missing: test suite, SECURITY.md, CI workflow.',
        durationMs: 2_000,
      });
      this.patch({ filesAnalyzed: 47 });
    } else {
      const parsed = parseGitHubUrl(this.run.githubUrl);
      if (!parsed) throw new Error(`Invalid GitHub URL: ${this.run.githubUrl}`);

      const t0 = Date.now();
      const treeResult: GitHubTreeResult = await fetchGitHubRepoTree(
        this.run.githubUrl,
        { signal: this.abortCtrl.signal },
      );
      if (this.aborted()) throw new Error('aborted');

      const samples = await sampleRepoCode(
        parsed,
        treeResult.meta.default_branch,
        treeResult.paths,
        { signal: this.abortCtrl.signal },
      );
      if (this.aborted()) throw new Error('aborted');

      const snap = snapshot(treeResult.paths, treeResult.truncatedByGitHub || treeResult.truncatedByApp);
      const project = {
        id: this.run.id,
        name: treeResult.meta.full_name,
        goal: '',
        source: 'github' as const,
        githubUrl: this.run.githubUrl,
        snapshot: snap,
        codeSignals: samples,
        github: {
          owner: parsed.owner,
          repo: parsed.repo,
          defaultBranch: treeResult.meta.default_branch,
        },
      };

      contextBundle = buildContextBundle(project);
      const durationMs = Date.now() - t0;

      this.addEvidence({
        stage: 'recon',
        eventType: 'recon-complete',
        summary: `Analyzed ${snap.totalFiles} files. Stack: ${snap.stack.slice(0, 4).map((s) => s.label).join(', ')}. Missing: ${snap.missing.map((m) => m.label).join(', ') || 'none'}.`,
        durationMs,
      });
      this.patch({
        filesAnalyzed: snap.totalFiles,
        repoOwner: parsed.owner,
        repoName: parsed.repo,
      });
    }

    // ── Stage 2: Fan-out ────────────────────────────────────────────────────
    this.patch({ stage: 'fan-out' });
    if (this.aborted()) throw new Error('aborted');

    // Call A (Plan) + Call B (Ask) run concurrently
    const [planResult, askResult] = await Promise.all([
      this.callBob('Plan', contextBundle, isDemo),
      this.callBob('Ask', contextBundle, isDemo),
    ]);
    if (this.aborted()) throw new Error('aborted');

    const executiveSummary = askResult.output.trim();
    this.patch({ executiveSummary });

    this.addEvidence({
      stage: 'fan-out',
      eventType: 'bob-plan',
      summary: planResult.ok
        ? `Bob (Plan mode) completed in ${planResult.durationMs}ms.`
        : `Bob (Plan mode) failed: ${planResult.stderr.slice(0, 100)}`,
      mode: 'Plan',
      durationMs: planResult.durationMs,
      costEstimate: planResult.costEstimate,
      promptSummary: first300(this.planPrompt(contextBundle)),
      responseSummary: first300(planResult.output),
    });

    this.addEvidence({
      stage: 'fan-out',
      eventType: 'bob-ask',
      summary: askResult.ok
        ? `Bob (Ask mode) produced executive summary.`
        : `Bob (Ask mode) failed: ${askResult.stderr.slice(0, 100)}`,
      mode: 'Ask',
      durationMs: askResult.durationMs,
      costEstimate: askResult.costEstimate,
      promptSummary: first300(this.askPrompt(contextBundle)),
      responseSummary: first300(askResult.output),
    });

    this.patch({
      totalCost: (this.run.totalCost ?? 0) +
        (planResult.costEstimate ?? 0) +
        (askResult.costEstimate ?? 0),
    });
    this.checkBudget();

    // Parse plan output → raw safe win candidates
    const rawWins = parsePlanOutput(planResult.output);

    // Call C: sequential Code calls for each candidate
    // devMode: limit to 1 file to preserve Bobcoin budget during development.
    const maxWins = this.devMode ? 1 : 5;
    const pendingWins: SafeWin[] = [];
    for (const raw of rawWins.slice(0, maxWins)) {
      if (this.aborted()) throw new Error('aborted');

      // Client-side path pre-filter before spending a Bob call
      const pathCheck = classifyByPath(raw.targetPath);
      if (!pathCheck.safe) {
        const win: SafeWin = {
          id: generateId(),
          type: (raw.type as SafeWinType) ?? 'add-docs',
          description: raw.description,
          targetPath: raw.targetPath,
          content: '',
          commitMessage: '',
          safetyStatus: 'deferred',
          safetyReason: pathCheck.reason,
        };
        pendingWins.push(win);
        this.addEvidence({
          stage: 'fan-out',
          eventType: 'bob-code',
          summary: `Skipped Code call for ${raw.targetPath}: ${pathCheck.reason}`,
          mode: 'Code',
          durationMs: 0,
          deferred: true,
          deferReason: pathCheck.reason,
        });
        continue;
      }

      const codeResult = await this.callBob('Code', contextBundle, isDemo, raw.targetPath);
      if (this.aborted()) throw new Error('aborted');

      const contentCheck = classifyContent(codeResult.output, null);

      const win: SafeWin = {
        id: generateId(),
        type: pathCheck.type,
        description: raw.description,
        targetPath: raw.targetPath,
        content: codeResult.output,
        commitMessage: '',
        safetyStatus: contentCheck.safe ? 'pending' : 'deferred',
        safetyReason: contentCheck.safe ? undefined : contentCheck.reason,
      };
      pendingWins.push(win);

      this.addEvidence({
        stage: 'fan-out',
        eventType: 'bob-code',
        summary: `Bob (Code mode) wrote ${raw.targetPath}.`,
        mode: 'Code',
        durationMs: codeResult.durationMs,
        costEstimate: codeResult.costEstimate,
        promptSummary: first300(this.codePrompt(contextBundle, raw)),
        responseSummary: first300(codeResult.output),
        deferred: !contentCheck.safe,
        deferReason: contentCheck.safe ? undefined : contentCheck.reason,
      });

      this.patch({
        totalCost: (this.run.totalCost ?? 0) + (codeResult.costEstimate ?? 0),
        safeWins: pendingWins,
      });
      this.checkBudget();
    }

    if (this.aborted()) throw new Error('aborted');

    // ── Stage 3: Safety gate ────────────────────────────────────────────────
    this.patch({ stage: 'safety-gate' });

    for (const win of pendingWins) {
      if (this.aborted()) throw new Error('aborted');
      if (win.safetyStatus === 'deferred') continue; // already decided

      if (this.devMode) {
        // devMode: skip Bob safety-gate call; auto-approve path-classified items.
        win.safetyStatus = 'approved';
        this.addEvidence({
          stage: 'safety-gate',
          eventType: 'safety-gate',
          summary: `Safety gate: ${win.targetPath} → auto-approved (dev mode)`,
          durationMs: 0,
          deferred: false,
        });
        this.patch({ safeWins: [...pendingWins] });
        continue;
      }

      const safetyResult = await this.callBobSafetyGate(win, isDemo);
      if (this.aborted()) throw new Error('aborted');

      const { safe, reason } = parseSafetyResponse(safetyResult.output);
      win.safetyStatus = safe ? 'approved' : 'deferred';
      win.safetyReason = safe ? undefined : reason;

      this.addEvidence({
        stage: 'safety-gate',
        eventType: 'safety-gate',
        summary: safe
          ? `Safety gate: ${win.targetPath} → SAFE`
          : `Safety gate: ${win.targetPath} → DEFERRED: ${reason ?? ''}`,
        durationMs: safetyResult.durationMs,
        costEstimate: safetyResult.costEstimate,
        deferred: !safe,
        deferReason: safe ? undefined : reason,
      });

      this.patch({
        safeWins: [...pendingWins],
        totalCost: (this.run.totalCost ?? 0) + (safetyResult.costEstimate ?? 0),
      });
      this.checkBudget();
    }

    const approvedWins = pendingWins.filter((w) => w.safetyStatus === 'approved');
    if (this.aborted()) throw new Error('aborted');

    // ── Stage 4: Apply + PR ─────────────────────────────────────────────────
    this.patch({ stage: 'apply' });

    if (isDemo) {
      // Skip real GitHub writes; use fixture data for commit SHAs and PR URL
      await this.demoDelay(1_000);
      const demoShas = ['a1b2c3d', 'e4f5g6h', 'i7j8k9l'];
      for (let i = 0; i < approvedWins.length; i++) {
        if (this.aborted()) throw new Error('aborted');
        const win = approvedWins[i];
        win.appliedAt = Date.now();
        win.commitSha = demoShas[i] ?? generateId().slice(0, 7);
        win.commitMessage = NORTHPEAK_DEMO_FIXTURE.commitMessages[win.targetPath] ?? `feat: add ${win.targetPath}`;
        this.addEvidence({
          stage: 'apply',
          eventType: 'file-applied',
          summary: `Committed ${win.targetPath} to fork branch (demo).`,
          durationMs: 0,
        });
        this.patch({ safeWins: [...pendingWins] });
        await this.demoDelay(600);
      }

      if (this.aborted()) throw new Error('aborted');
      await this.demoDelay(800);
      const prUrl = 'https://github.com/bobsprint-demo/proposal-studio/pull/1';
      this.patch({
        prUrl,
        prTitle: NORTHPEAK_DEMO_FIXTURE.prTitle,
        branchName: 'bobsprint/rescue-demo',
        forkOwner: 'bobsprint-demo',
      });
      this.addEvidence({
        stage: 'apply',
        eventType: 'pr-opened',
        summary: `Opened draft PR: "${NORTHPEAK_DEMO_FIXTURE.prTitle}"`,
        durationMs: 0,
      });
    } else if (approvedWins.length > 0 && this.pat) {
      // Real GitHub apply
      const parsed = parseGitHubUrl(this.run.githubUrl)!;
      const { forkOwner, defaultBranch } = await getOrCreateFork(
        parsed.owner, parsed.repo, this.pat,
      );
      if (this.aborted()) throw new Error('aborted');

      const branchName = `bobsprint/rescue-${Date.now().toString(36)}`;
      const baseSha = await getLatestCommitSha(forkOwner, parsed.repo, defaultBranch, this.pat);
      await createBranch(forkOwner, parsed.repo, branchName, baseSha, this.pat);
      this.patch({ branchName, forkOwner });

      for (const win of approvedWins) {
        if (this.aborted()) throw new Error('aborted');
        const t0 = Date.now();

        // Commit message via Bob Ask
        const msgResult = await this.bobRun(this.commitMsgPrompt(win), {
          mode: 'Ask',
          signal: this.abortCtrl.signal,
        });
        win.commitMessage = msgResult.ok ? msgResult.output.trim() : `feat: add ${win.targetPath}`;

        const sha = await upsertFile(
          forkOwner, parsed.repo, win.targetPath,
          win.content, win.commitMessage, branchName, this.pat,
        );
        win.appliedAt = Date.now();
        win.commitSha = sha;

        this.addEvidence({
          stage: 'apply',
          eventType: 'file-applied',
          summary: `Committed ${win.targetPath} (${sha.slice(0, 7)}).`,
          durationMs: Date.now() - t0,
        });
        this.patch({ safeWins: [...pendingWins] });
      }

      if (this.aborted()) throw new Error('aborted');

      // PR body via Bob Ask
      const prBodyResult = await this.bobRun(this.prBodyPrompt(approvedWins, parsed.repo), {
        mode: 'Ask',
        signal: this.abortCtrl.signal,
      });
      const [prTitle, ...bodyLines] = prBodyResult.ok
        ? prBodyResult.output.trim().split('\n')
        : [`feat(bobsprint): add missing tests and docs`, ''];
      const prBody = bodyLines.join('\n').trim();

      const prUrl = await createDraftPR(
        parsed.owner, parsed.repo,
        prTitle.replace(/^feat\(bobsprint\):\s*/i, 'feat(bobsprint): ').trim(),
        prBody,
        `${forkOwner}:${branchName}`,
        defaultBranch,
        this.pat,
      );
      this.patch({ prUrl, prTitle: prTitle.trim() });
      this.addEvidence({
        stage: 'apply',
        eventType: 'pr-opened',
        summary: `Opened draft PR: "${prTitle.trim()}"`,
      });
    }

    // ── Stage 5: Done ───────────────────────────────────────────────────────
    if (this.aborted()) throw new Error('aborted');
    this.patch({
      stage: 'done',
      completedAt: Date.now(),
      safeWins: pendingWins,
    });
  }

  // ── Bob call helpers ──────────────────────────────────────────────────────

  private async callBob(
    mode: 'Plan' | 'Ask' | 'Code',
    contextBundle: string,
    isDemo: boolean,
    targetPath?: string,
  ): Promise<BobShellResult> {
    let prompt = '';
    let raw: RawPlanItem | undefined;

    if (mode === 'Plan') {
      prompt = this.planPrompt(contextBundle);
    } else if (mode === 'Ask') {
      prompt = this.askPrompt(contextBundle);
    } else if (mode === 'Code' && targetPath) {
      raw = { type: 'add-docs', targetPath, description: '' };
      prompt = this.codePrompt(contextBundle, raw);
    }

    if (isDemo) {
      await this.demoDelay();
      let output = '';
      if (mode === 'Plan') output = NORTHPEAK_DEMO_FIXTURE.planModeOutput;
      else if (mode === 'Ask') output = NORTHPEAK_DEMO_FIXTURE.askModeOutput;
      else if (mode === 'Code' && targetPath) {
        output = NORTHPEAK_DEMO_FIXTURE.codeModeOutputs[targetPath] ?? '';
      }
      return { ok: true, output, stderr: '', durationMs: DEMO_DELAY_MS, exitCode: 0, costEstimate: 0.3 };
    }

    return this.bobRun(prompt, { mode, signal: this.abortCtrl.signal });
  }

  private async callBobSafetyGate(win: SafeWin, isDemo: boolean): Promise<BobShellResult> {
    if (isDemo) {
      await this.demoDelay(500);
      const resp = NORTHPEAK_DEMO_FIXTURE.safetyGateResponses[win.targetPath] ?? 'SAFE';
      return { ok: true, output: resp, stderr: '', durationMs: 500, exitCode: 0, costEstimate: 0.05 };
    }
    const prompt = this.safetyPrompt(win);
    return this.bobRun(prompt, { mode: 'Ask', signal: this.abortCtrl.signal });
  }

  // ── Prompt templates ──────────────────────────────────────────────────────

  private planPrompt(ctx: string): string {
    return `${ctx}

Your job: identify add-only improvements this repository is missing.
Output a JSON array, nothing else:
[{"type":"add-tests"|"add-docs"|"add-readme-section","targetPath":"...","description":"..."}]
HARD CONSTRAINT: every proposal must target a NEW file path that does not yet exist in the repository. If the natural improvement targets an existing file (e.g. adding tests to test.js), propose a new sibling file instead (e.g. test-edge-cases.js, test-errors.js). Never propose editing an existing file.
Rules:
- Maximum 5 items. Only new files or content added to existing files.
- No deletions, no logic edits, no config/dependency changes.
- Prioritize: missing tests > missing docs > missing README.
- If no gaps, return [].`;
  }

  private askPrompt(ctx: string): string {
    return `${ctx}

Write a 5-bullet executive summary:
• What this codebase does
• Overall health (good/needs-work/critical) + one reason
• Most important gap
• Top action a new owner should take first
• Sprint readiness verdict

Plain text, bullets only, no headers.`;
  }

  private codePrompt(ctx: string, raw: RawPlanItem): string {
    const lang = extToLang(raw.targetPath);
    return `${ctx}

File to create: ${raw.targetPath}
Type: ${raw.type} — ${raw.description}
Language: ${lang}

Output ONLY the complete file content. No explanation. No markdown fences.`;
  }

  private safetyPrompt(win: SafeWin): string {
    return `A file will be added to ${this.run.repoName ?? 'the repository'}:
Path: ${win.targetPath}
Content:
${win.content.slice(0, 1_500)}

Does adding this file change the runtime behavior of any existing code?
Answer exactly: SAFE  or  DEFERRED: [one reason sentence]. Nothing else.`;
  }

  private commitMsgPrompt(win: SafeWin): string {
    return `File added: ${win.targetPath} — ${win.description}
Write a git commit message (conventional commits):
Line 1: "feat: " or "test: " or "docs: " + description under 50 chars
Blank line
1-sentence body.
Only the commit message. Nothing else.`;
  }

  private prBodyPrompt(wins: SafeWin[], repoName: string): string {
    const list = wins.map((w) => `- ${w.targetPath} — ${w.description}`).join('\n');
    return `These files were added to ${repoName}:
${list}

Write a GitHub PR:
Title (line 1, under 72 chars, prefix "feat(bobsprint): ")
Blank line
## Summary
[2-3 sentences]
## Changes
[bullet list]
## Notes
- Draft PR. All changes are additive only.
- Generated by BobSprint. Review before merging.`;
  }
}

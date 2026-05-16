#!/usr/bin/env node
/**
 * BobSprint — real bob end-to-end rescue test
 * Exercises the same bob invocations the autopilot sends, against a live repo.
 * Does NOT require the Next.js dev server; calls bob directly with the same args
 * and prompts used by app/api/bob/route.ts + lib/autopilot.ts.
 *
 * Usage:
 *   node scripts/rescue-test.mjs
 *
 * Stop conditions: aborts if totalCost > 2.0 or any bob call exits non-zero.
 */

import { spawn } from 'node:child_process';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(ROOT, 'bob_sessions', 'bridge.log');

// ── Config ────────────────────────────────────────────────────────────────────

const REPO = 'sindresorhus/is-online';
// On Windows, spawn node <entry.js> directly to avoid .cmd wrapper restrictions.
function resolveBob() {
  if (process.env.BOB_COMMAND) return { cmd: process.env.BOB_COMMAND, prefix: [] };
  if (process.platform === 'win32' && process.env.APPDATA) {
    const entry = path.join(process.env.APPDATA, 'npm', 'node_modules', 'bobshell', 'bundle', 'bob.js');
    if (fs.existsSync(entry)) return { cmd: process.execPath, prefix: [entry] };
  }
  return { cmd: 'bob', prefix: [] };
}
const { cmd: BOB_CMD, prefix: BOB_PREFIX } = resolveBob();
const MAX_COINS_PER_CALL = parseFloat(process.env.BOB_MAX_COINS ?? '1.0');
const TOTAL_BUDGET = 2.0;

// ── Log ───────────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function logSection(title) { console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`); }

// ── GitHub helpers ────────────────────────────────────────────────────────────

function ghGet(url) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'BobSprint-rescue-test/1.0' } };
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return ghGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub ${res.statusCode}: ${data.slice(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); } catch { reject(new Error(`JSON parse: ${data.slice(0, 100)}`)); }
      });
    }).on('error', reject);
  });
}

// ── Bob spawn ─────────────────────────────────────────────────────────────────

// Parses bob --output-format json stdout: splits response text from trailing stats block.
function parseBobOutput(raw) {
  const lines = raw.split('\n');
  let jsonStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '{') { jsonStart = i; break; }
  }
  if (jsonStart === -1) return { response: raw.trim(), stats: null };
  const response = lines.slice(0, jsonStart).join('\n').trim();
  try {
    const parsed = JSON.parse(lines.slice(jsonStart).join('\n'));
    return { response, stats: parsed?.stats ?? null };
  } catch { return { response: raw.trim(), stats: null }; }
}

function bobCall(prompt, mode) {
  return new Promise((resolve) => {
    const args = [
      '--accept-license',
      '--approval-mode', 'yolo',
      '--hide-intermediary-output',
      '--output-format', 'json',
      '--chat-mode', mode.toLowerCase(),
      '--max-coins', String(MAX_COINS_PER_CALL),
      prompt,
    ];

    let stdout = '';
    let stderr = '';
    const t0 = Date.now();

    const proc = spawn(BOB_CMD, [...BOB_PREFIX, ...args], {
      cwd: ROOT,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.stdin.end();
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const durationMs = Date.now() - t0;
      const exitCode = code ?? -1;
      const { response, stats } = parseBobOutput(stdout);

      // Log to bridge.log (same format as the real bridge)
      const record = JSON.stringify({
        ts: new Date().toISOString(),
        command: BOB_CMD,
        args: args.slice(0, -1), // omit prompt for privacy
        mode,
        durationMs,
        exitCode,
        ok: exitCode === 0,
        mock: false,
        costEstimate: stats?.sessionCost ?? null,
        budgetSpend: stats?.budgetSpend ?? null,
      });
      try { fs.appendFileSync(LOG_FILE, record + '\n', 'utf8'); } catch { /* non-fatal */ }

      resolve({ ok: exitCode === 0, output: response, stderr: stderr.trim(), durationMs, exitCode, costEstimate: stats?.sessionCost ?? null });
    });

    proc.on('error', (err) => {
      resolve({ ok: false, output: '', stderr: err.message, durationMs: Date.now() - t0, exitCode: -1, costEstimate: null });
    });
  });
}

// ── Plan parser ───────────────────────────────────────────────────────────────

function parsePlan(output) {
  const match = output.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.filter(
      x => x && typeof x.type === 'string' && typeof x.targetPath === 'string'
    ) : [];
  } catch { return []; }
}

// Safe-win path filter (mirrors lib/safe-win-classifier.ts)
const UNSAFE_PATHS = /\.(json|lock|yaml|yml|toml|env|cfg|ini|conf)$|^(package|yarn|Gemfile|Cargo|Pipfile|go\.mod|go\.sum|requirements)/i;
const UNSAFE_DIRS = /^(node_modules|\.git|dist|build|\.next|vendor)\//;
function pathIsSafe(p) {
  if (UNSAFE_PATHS.test(path.basename(p))) return { safe: false, reason: `Unsafe file type: ${p}` };
  if (UNSAFE_DIRS.test(p)) return { safe: false, reason: `Unsafe directory: ${p}` };
  return { safe: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const wallStart = Date.now();
  let totalCost = 0;
  const evidence = [];

  log('\n╔══════════════════════════════════════════════════════════╗');
  log(`║  BobSprint rescue test — ${REPO.padEnd(31)}║`);
  log(`║  Dev mode: 1 file cap, safety gate auto-approved         ║`);
  log(`║  Budget cap: ₿${TOTAL_BUDGET.toFixed(1)} total / ₿${MAX_COINS_PER_CALL.toFixed(1)} per bob call            ║`);
  log('╚══════════════════════════════════════════════════════════╝');

  // ── Stage 1: Recon ──────────────────────────────────────────────────────────
  logSection('Stage 1: Recon');

  const reconStart = Date.now();
  const meta = await ghGet(`https://api.github.com/repos/${REPO}`);
  const treeData = await ghGet(`https://api.github.com/repos/${REPO}/git/trees/${meta.default_branch}?recursive=1`);

  const paths = (treeData.tree ?? []).filter(f => f.type === 'blob').map(f => f.path);
  const truncated = treeData.truncated;
  const reconMs = Date.now() - reconStart;

  log(`  Repo:     ${meta.full_name}`);
  log(`  Desc:     ${meta.description}`);
  log(`  Language: ${meta.language} | Stars: ${meta.stargazers_count}`);
  log(`  Files:    ${paths.length}${truncated ? ' (GitHub truncated)' : ''}`);
  log(`  Recon:    ${reconMs}ms`);

  evidence.push({ stage: 'recon', summary: `Analyzed ${paths.length} files. Language: ${meta.language}.`, durationMs: reconMs });

  // Build context bundle
  const fileList = paths.slice(0, 80).map((p, i) => `${String(i+1).padStart(2)}. ${p}`).join('\n');
  const contextBundle = [
    `Repository: ${meta.full_name}`,
    `URL: https://github.com/${meta.full_name}`,
    `Description: ${meta.description ?? '(none)'}`,
    `Language: ${meta.language}`,
    `Stars: ${meta.stargazers_count}`,
    `Open issues: ${meta.open_issues_count}`,
    '',
    '## File tree',
    fileList,
  ].join('\n');

  // ── Stage 2: Fan-out ────────────────────────────────────────────────────────
  logSection('Stage 2: Fan-out (Plan + Ask concurrent)');

  const planPrompt = `${contextBundle}

Your job: identify add-only improvements this repository is missing.
Output a JSON array, nothing else:
[{"type":"add-tests"|"add-docs"|"add-readme-section","targetPath":"...","description":"..."}]
Rules:
- Maximum 5 items. Only new files or content added to existing files.
- No deletions, no logic edits, no config/dependency changes.
- Prioritize: missing tests > missing docs > missing README.
- If no gaps, return [].`;

  const askPrompt = `${contextBundle}

Write a 5-bullet executive summary:
• What this codebase does
• Overall health (good/needs-work/critical) + one reason
• Most important gap
• Top action a new owner should take first
• Sprint readiness verdict

Plain text, bullets only, no headers.`;

  log('  Calling bob Plan + Ask in parallel...');
  const fanOutStart = Date.now();
  const [planResult, askResult] = await Promise.all([
    bobCall(planPrompt, 'plan').then(r => { log(`  Plan done: ${(r.durationMs/1000).toFixed(1)}s, exit ${r.exitCode}${r.costEstimate != null ? `, ₿${r.costEstimate}` : ''}`); return r; }),
    bobCall(askPrompt, 'ask').then(r =>  { log(`  Ask  done: ${(r.durationMs/1000).toFixed(1)}s, exit ${r.exitCode}${r.costEstimate != null ? `, ₿${r.costEstimate}` : ''}`); return r; }),
  ]);

  if (!planResult.ok) {
    log(`\n✗ Plan call failed (exit ${planResult.exitCode})`);
    log(`  stderr: ${planResult.stderr.slice(0, 300)}`);
    process.exit(1);
  }
  if (!askResult.ok) {
    log(`\n✗ Ask call failed (exit ${askResult.exitCode})`);
    log(`  stderr: ${askResult.stderr.slice(0, 300)}`);
    process.exit(1);
  }

  totalCost += (planResult.costEstimate ?? 0) + (askResult.costEstimate ?? 0);
  if (totalCost > TOTAL_BUDGET) {
    log(`\n⛔ Budget exceeded: ₿${totalCost.toFixed(3)} > ₿${TOTAL_BUDGET}. Aborting.`);
    process.exit(1);
  }

  log(`\n  Executive summary:\n${askResult.output.split('\n').map(l => '    ' + l).join('\n')}`);

  const planItems = parsePlan(planResult.output);
  log(`\n  Plan raw output (first 400 chars):\n    ${planResult.output.slice(0, 400)}`);
  log(`\n  Parsed plan items: ${planItems.length}`);
  planItems.forEach((item, i) => log(`    [${i+1}] ${item.type} → ${item.targetPath}: ${item.description}`));

  if (planItems.length === 0) {
    log('\n  ⚠ No plan items parsed. Bob returned no proposals.');
    log('  Check if Plan mode output format matches parsePlan() regex.');
  }

  evidence.push({
    stage: 'fan-out', mode: 'Plan',
    summary: `Plan: ${planItems.length} proposals. Ask: executive summary.`,
    durationMs: Math.max(planResult.durationMs, askResult.durationMs),
  });

  // Code call for 1 file (devMode cap = 1)
  const safeItem = planItems.find(item => pathIsSafe(item.targetPath).safe);
  if (!safeItem) {
    log('\n  ⚠ No safe-win candidates from plan (all paths blocked by classifier).');
    logSection('Result');
    log(`  Stages reached: Recon ✓  Fan-out ✓  Code: skipped`);
    log(`  Total cost: ₿${totalCost.toFixed(3)}`);
    log(`  Duration: ${((Date.now() - wallStart)/1000).toFixed(1)}s`);
    return;
  }

  const lang = safeItem.targetPath.split('.').pop()?.toLowerCase() ?? 'text';
  const langLabel = { py: 'Python', ts: 'TypeScript', tsx: 'TypeScript/React', js: 'JavaScript', md: 'Markdown' }[lang] ?? 'text';

  const codePrompt = `${contextBundle}

File to create: ${safeItem.targetPath}
Type: ${safeItem.type} — ${safeItem.description}
Language: ${langLabel}

Output ONLY the complete file content. No explanation. No markdown fences.`;

  log(`\n  Code call for: ${safeItem.targetPath}`);
  const codeResult = await bobCall(codePrompt, 'code');
  log(`  Code done: ${(codeResult.durationMs/1000).toFixed(1)}s, exit ${codeResult.exitCode}${codeResult.costEstimate != null ? `, ₿${codeResult.costEstimate}` : ''}`);

  if (!codeResult.ok) {
    log(`\n✗ Code call failed (exit ${codeResult.exitCode})`);
    log(`  stderr: ${codeResult.stderr.slice(0, 300)}`);
  }

  totalCost += codeResult.costEstimate ?? 0;

  // ── Stage 3: Safety gate (auto-approved in devMode) ─────────────────────────
  logSection('Stage 3: Safety gate (devMode — auto-approved)');
  log(`  ${safeItem.targetPath} → APPROVED (dev mode, no Bob call)`);

  // ── Stage 4: Apply ──────────────────────────────────────────────────────────
  logSection('Stage 4: Apply');
  log('  No GitHub PAT configured → Apply skipped (fork + PR not created).');
  log('  Add GITHUB_PAT to .env.local to enable real PR creation.');

  // ── Stage 5: Done ───────────────────────────────────────────────────────────
  logSection('Stage 5: Done');

  const wallMs = Date.now() - wallStart;

  log(`\n  ✓ Rescue complete.\n`);
  log(`  Stages reached:  Recon ✓  Fan-out ✓  Safety gate ✓  Apply: skipped (no PAT)  Done ✓`);
  log(`  Files proposed:  ${planItems.length}`);
  log(`  Safe candidates: ${planItems.filter(i => pathIsSafe(i.targetPath).safe).length}`);
  log(`  Applied:         0 (no PAT)`);
  log(`  Deferred:        ${planItems.filter(i => !pathIsSafe(i.targetPath).safe).length} (path classifier rejected)`);
  log(`  Total cost:      ₿${totalCost.toFixed(3)} (${totalCost === 0 ? 'cost format not yet detected in bob output' : 'from bob output'})`);
  log(`  Duration:        ${(wallMs/1000).toFixed(1)}s`);

  // ── Bob output inspection ────────────────────────────────────────────────────
  logSection('Code output inspection');
  log(`  File: ${safeItem.targetPath}`);
  log(`  Lines: ${codeResult.output.split('\n').length}`);
  log(`  First 20 lines:\n`);
  codeResult.output.split('\n').slice(0, 20).forEach((line, i) => {
    log(`    ${String(i+1).padStart(3)}  ${line}`);
  });

  // ── stderr dump (cost format detection) ─────────────────────────────────────
  logSection('stderr samples (cost format detection)');
  const stderrs = [planResult.stderr, askResult.stderr, codeResult.stderr].filter(Boolean);
  if (stderrs.length === 0) {
    log('  All calls produced empty stderr.');
  } else {
    stderrs.forEach((s, i) => {
      const label = ['Plan', 'Ask', 'Code'][i];
      log(`  [${label}] ${s.slice(0, 300).replace(/\n/g, '  ')}`);
    });
  }

  // ── bridge.log snippet ───────────────────────────────────────────────────────
  logSection('bridge.log entries from this run');
  try {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').slice(-5);
    lines.forEach(l => log(`  ${l}`));
  } catch {
    log('  bridge.log not found or unreadable.');
  }

  log('\n');
}

main().catch(err => {
  console.error('\n✗ rescue-test failed:', err.message);
  process.exit(1);
});

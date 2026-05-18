// ── Stack detection ──────────────────────────────────────────────────────────

export type StackKind =
  | 'nextjs' | 'react' | 'vite' | 'node' | 'python' | 'fastapi'
  | 'django' | 'flask' | 'php' | 'laravel' | 'docker' | 'prisma'
  | 'alembic' | 'tailwind' | 'typescript' | 'postgres' | 'mongodb'
  | 'redis' | 'go' | 'rust' | 'java' | 'spring' | 'kubernetes'
  | 'terraform' | 'github-actions' | 'jest' | 'vitest' | 'pytest'
  | 'reportlab';

export interface StackHit {
  kind: StackKind;
  label: string;
  evidence: string;
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'tooling' | 'testing';
}

export interface FolderInfo {
  path: string;
  purpose: string;
  fileCount: number;
}

export type AppType = 'app' | 'library' | 'cli' | 'docs' | 'monorepo' | 'unknown';

export type ArtifactStatus = 'present' | 'missing' | 'unknown';
export type ArtifactConfidence = 'high' | 'medium' | 'low';

export interface ArtifactCheck {
  key: string;
  label: string;
  why: string;
  status: ArtifactStatus;
  confidence: ArtifactConfidence;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RepoSnapshot {
  totalFiles: number;
  totalDirs: number;
  estimatedLoc: number;
  topExtensions: Array<{ ext: string; count: number }>;
  importantFolders: FolderInfo[];
  stack: StackHit[];
  missing: MissingItem[];
  unverified: ArtifactCheck[];
  artifacts: ArtifactCheck[];
  fileTree: string[];
  treeTruncated: boolean;
  appType: AppType;
}

export interface MissingItem {
  key: string;
  label: string;
  why: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RiskCard {
  category: 'security' | 'maintainability' | 'testing' | 'documentation' | 'deployment' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  why: string;
  fix: string;
  relatedPaths: string[];
}

export type SampleCategory = 'identity' | 'source' | 'tests' | 'docs' | 'devops';

export interface CodeSample {
  path: string;
  size: number;
  totalSize: number;
  preview: string;
  reason: string;
  category?: SampleCategory;
  truncated: boolean;
}

export interface Project {
  id: string;
  name: string;
  goal: string;
  source: 'github' | 'demo';
  githubUrl?: string;
  snapshot: RepoSnapshot;
  codeSignals?: CodeSample[];
  github?: { owner: string; repo: string; defaultBranch: string };
  isDemo?: boolean;
}

// ── Bob Shell bridge ──────────────────────────────────────────────────────────

export interface BobShellResult {
  ok: boolean;
  output: string;
  stderr: string;
  durationMs: number;
  exitCode: number;
  costEstimate?: number;  // stats.sessionCost from bob JSON output (per-call Bobcoins)
  budgetSpend?: number;   // stats.budgetSpend — cumulative Bobcoins against 40-coin limit
}

// ── Auto-Pilot pipeline ───────────────────────────────────────────────────────

export type AutoPilotStage =
  | 'idle' | 'recon' | 'fan-out' | 'safety-gate' | 'apply' | 'done'
  | 'aborted' | 'error';

export type SafeWinType =
  | 'add-tests' | 'add-docs' | 'add-jsdoc' | 'add-readme-section';

export interface SafeWin {
  id: string;
  type: SafeWinType;
  description: string;
  targetPath: string;
  content: string;          // full file content Bob produced
  commitMessage: string;    // Bob-generated
  safetyStatus: 'pending' | 'approved' | 'deferred';
  safetyReason?: string;
  appliedAt?: number;
  commitSha?: string;
}

export interface EvidenceEntry {
  id: string;
  runId: string;
  timestamp: number;
  stage: AutoPilotStage;
  eventType:
    | 'recon-complete' | 'bob-plan' | 'bob-ask' | 'bob-code'
    | 'safety-gate' | 'file-applied' | 'pr-opened' | 'error' | 'aborted';
  summary: string;
  promptSummary?: string;    // first 300 chars of prompt sent
  responseSummary?: string;  // first 300 chars of response received
  mode?: 'Plan' | 'Ask' | 'Code';
  durationMs?: number;
  costEstimate?: number;
  deferred?: boolean;
  deferReason?: string;
}

export interface AutoPilotRun {
  id: string;
  githubUrl: string;
  repoOwner?: string;
  repoName?: string;
  startedAt: number;
  completedAt?: number;
  stage: AutoPilotStage;
  safeWins: SafeWin[];
  evidence: EvidenceEntry[];
  executiveSummary?: string;
  prUrl?: string;
  prTitle?: string;
  totalCost: number;
  forkOwner?: string;
  branchName?: string;
  filesAnalyzed?: number;
  error?: string;
  /** Non-fatal Apply-stage problem (e.g. invalid GitHub PAT). The run still
   *  completes — Bob's analysis is preserved; only the PR was skipped. */
  applyWarning?: string;
  isDemo: boolean;
  abortedAt?: number;
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

export interface DemoFixture {
  planModeOutput: string;
  askModeOutput: string;
  codeModeOutputs: Record<string, string>;
  safetyGateResponses: Record<string, string>;
  commitMessages: Record<string, string>;
  prTitle: string;
  prBody: string;
}

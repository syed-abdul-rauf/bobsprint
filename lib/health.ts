// Derives a repo "health" score + letter grade from a finished (or partial)
// AutoPilotRun. Pure + deterministic — no extra persistence, no Bob calls.
// Inputs are what the pipeline already records: the recon-complete evidence
// summary, files analyzed, Bob's executive summary verdict, and the proposed
// safe wins (gaps Bob found = signal the repo was missing them).

import type { AutoPilotRun } from './types';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthResult {
  score: number;            // 0–100
  grade: Grade;
  tone: 'mint' | 'cyan' | 'violet';
  headline: string;
  reasons: string[];
}

function gradeFor(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 58) return 'D';
  return 'F';
}

const HEADLINES: Record<Grade, string> = {
  A: 'Production-ready',
  B: 'Solid, minor gaps',
  C: 'Needs work',
  D: 'At risk',
  F: 'Critical gaps',
};

export function computeHealth(run: AutoPilotRun): HealthResult {
  const reasons: string[] = [];
  let score = 100;

  // 1. Missing artifacts parsed from the recon-complete summary.
  const recon = run.evidence.find((e) => e.eventType === 'recon-complete');
  const missingMatch = recon?.summary.match(/Missing:\s*([^.]+)/i);
  const missing = missingMatch
    ? missingMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !/^none$/i.test(s))
    : [];
  if (missing.length) {
    const penalty = Math.min(45, missing.length * 7);
    score -= penalty;
    reasons.push(`${missing.length} missing essentials (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''})`);
  } else if (recon) {
    reasons.push('No critical artifacts missing');
  }

  // 2. Bob's own executive verdict.
  const summary = (run.executiveSummary ?? '').toLowerCase();
  if (/\bcritical\b/.test(summary)) {
    score -= 14;
    reasons.push('Bob flagged critical health');
  } else if (/needs[\s-]?work/.test(summary)) {
    score -= 7;
    reasons.push('Bob assessed: needs work');
  } else if (/\bgood\b|healthy/.test(summary)) {
    score += 4;
    reasons.push('Bob assessed: good health');
  }

  // 3. Deferred wins = Bob found changes too risky to auto-apply.
  const deferred = run.safeWins.filter((w) => w.safetyStatus === 'deferred').length;
  if (deferred) {
    score -= Math.min(10, deferred * 3);
    reasons.push(`${deferred} change(s) deferred for human review`);
  }

  // 4. A larger codebase with the same gaps is riskier to onboard.
  const files = run.filesAnalyzed ?? 0;
  if (files > 150 && missing.length > 2) {
    score -= 5;
    reasons.push('Large codebase with structural gaps');
  }

  // Demo repo is intentionally a representative "needs work" example.
  if (run.isDemo) {
    score = 62;
    reasons.length = 0;
    reasons.push('Missing test suite, CI workflow, and security policy');
  }

  score = Math.max(34, Math.min(98, Math.round(score)));
  const grade = gradeFor(score);
  const tone = grade === 'A' || grade === 'B' ? 'mint' : grade === 'C' ? 'cyan' : 'violet';
  return { score, grade, tone, headline: HEADLINES[grade], reasons };
}

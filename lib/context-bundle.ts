// Builds the compact context string prepended to every Bob prompt.
// Hard cap: 7 500 chars so the full bundle + task prompt fits in one context window.

import type { Project } from './types';
import { generateRisks } from './analyzer';

const HARD_CAP = 7_500;
const SNIPPET_CHARS = 900;  // per code sample
const MAX_TREE_LINES = 60;
const MAX_SAMPLES = 6;

export function buildContextBundle(project: Project): string {
  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push(`Repository: ${project.name}`);
  if (project.githubUrl) lines.push(`URL: ${project.githubUrl}`);
  lines.push(`Type: ${project.snapshot.appType}`);
  lines.push(
    `Size: ${project.snapshot.totalFiles} files, ~${project.snapshot.estimatedLoc.toLocaleString()} LOC`,
  );
  lines.push('');

  // ── Stack ─────────────────────────────────────────────────────────────────
  if (project.snapshot.stack.length > 0) {
    const byCategory = new Map<string, string[]>();
    for (const s of project.snapshot.stack) {
      const bucket = byCategory.get(s.category) ?? [];
      bucket.push(s.label);
      byCategory.set(s.category, bucket);
    }
    lines.push('## Stack');
    for (const [cat, labels] of byCategory) {
      lines.push(`${cat}: ${labels.join(', ')}`);
    }
    lines.push('');
  }

  // ── Missing artifacts ─────────────────────────────────────────────────────
  const missing = [...project.snapshot.missing].sort(
    (a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] ?? 2) - ({ high: 0, medium: 1, low: 2 }[b.severity] ?? 2),
  );
  if (missing.length > 0) {
    lines.push('## Missing');
    for (const m of missing.slice(0, 6)) {
      lines.push(`- [${m.severity}] ${m.label}: ${m.why}`);
    }
    lines.push('');
  }

  // ── Top risks (from analyzer, capped at 3) ────────────────────────────────
  const risks = generateRisks(project.snapshot);
  if (risks.length > 0) {
    lines.push('## Risks');
    for (const r of risks.slice(0, 3)) {
      lines.push(`- [${r.severity}] ${r.title}: ${r.why}`);
    }
    lines.push('');
  }

  // ── File tree ─────────────────────────────────────────────────────────────
  const tree = project.snapshot.fileTree;
  if (tree.length > 0) {
    lines.push('## File tree');
    lines.push(tree.slice(0, MAX_TREE_LINES).join('\n'));
    if (project.snapshot.treeTruncated || tree.length > MAX_TREE_LINES) {
      lines.push('… (truncated)');
    }
    lines.push('');
  }

  // ── Code samples ──────────────────────────────────────────────────────────
  const samples = project.codeSignals?.slice(0, MAX_SAMPLES) ?? [];
  if (samples.length > 0) {
    lines.push('## Code samples');
    let budget = HARD_CAP - lines.join('\n').length;

    for (const s of samples) {
      if (budget < 200) break;
      const snippet = s.preview.slice(0, Math.min(SNIPPET_CHARS, budget - 80));
      const block = [
        `\n### ${s.path}`,
        `\`\`\``,
        snippet + (snippet.length < s.preview.length ? '\n…' : ''),
        `\`\`\``,
      ].join('\n');
      lines.push(block);
      budget -= block.length;
    }
  }

  const result = lines.join('\n');
  return result.length > HARD_CAP ? result.slice(0, HARD_CAP) + '\n… (bundle truncated)' : result;
}

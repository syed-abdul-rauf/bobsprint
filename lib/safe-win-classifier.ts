// Pure classifier — no I/O, fully unit-testable.
// Two-layer gate used by AutoPilotController before any Bob safety-gate call.

import type { SafeWinType } from './types';

export type ClassifyResult =
  | { safe: true; type: SafeWinType }
  | { safe: false; reason: string };

// ── Path patterns ──────────────────────────────────────────────────────────

const UNSAFE_BASENAMES = new Set([
  'package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json',
  'dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
]);

const UNSAFE_EXT_RE = /\.(ya?ml|toml|ini|lock|cfg)$/i;
const UNSAFE_CONFIG_RE = /\.config\.[jt]sx?$|\.config\.mjs$/i;
const DOTENV_RE = /^\.env($|\.)/i;

function inferType(p: string): SafeWinType | null {
  const lower = p.toLowerCase();
  const basename = lower.split('/').pop() ?? lower;

  if (
    /\.(test|spec)\.[tj]sx?$/.test(lower) ||
    /(^|\/)tests?\/test_[^/]+\.py$/.test(lower) ||
    /(^|\/)tests?\/[^/]+\.py$/.test(lower) ||
    /(^|\/)__tests__\//.test(lower) ||
    /(^|\/)(test_[^/]+|[^/]+_test)\.py$/.test(lower)
  ) return 'add-tests';

  if (/^readme\.(md|mdx|rst|txt)$/.test(basename)) return 'add-readme-section';

  if (/(^|\/)docs?\//i.test(lower) || /\.(md|mdx|rst)$/.test(lower)) return 'add-docs';

  if (/\.[tj]sx?$/.test(lower)) return 'add-jsdoc';

  return null;
}

export function classifyByPath(targetPath: string): ClassifyResult {
  const normalized = targetPath.trim().replace(/^\/+/, '');
  const basename = normalized.split('/').pop() ?? normalized;

  if (UNSAFE_BASENAMES.has(basename.toLowerCase())) {
    return { safe: false, reason: `Unsafe file: ${basename}` };
  }
  if (DOTENV_RE.test(basename)) {
    return { safe: false, reason: `Env file: ${basename}` };
  }
  if (/^dockerfile/i.test(basename)) {
    return { safe: false, reason: `Dockerfile: ${basename}` };
  }
  if (UNSAFE_EXT_RE.test(basename)) {
    return { safe: false, reason: `Config/lock file extension: ${basename}` };
  }
  if (UNSAFE_CONFIG_RE.test(normalized)) {
    return { safe: false, reason: `Config file: ${basename}` };
  }

  const type = inferType(normalized);
  if (!type) {
    return { safe: false, reason: `Cannot classify safe-win type for: ${normalized}` };
  }

  return { safe: true, type };
}

// ── Content classifier ──────────────────────────────────────────────────────
// When originalContent is null we are creating a new file — always safe here.
// The `type` field is a sentinel; callers should use the type from classifyByPath.

function isTrivial(line: string): boolean {
  const t = line.trim();
  return !t || /^(\/\/|#|[*]|\/\*|\*\/)/.test(t);
}

export function classifyContent(
  newContent: string,
  originalContent: string | null,
): ClassifyResult {
  if (originalContent === null) {
    return { safe: true, type: 'add-docs' }; // new file — safe
  }

  const origLines = new Set(originalContent.split('\n').map((l) => l.trimEnd()));
  const newLines = new Set(newContent.split('\n').map((l) => l.trimEnd()));

  const removed = [...origLines].filter((l) => !newLines.has(l) && !isTrivial(l));
  if (removed.length > 0) {
    const sample = removed[0].trim().slice(0, 60);
    return { safe: false, reason: `Removes ${removed.length} non-trivial line(s): "${sample}"` };
  }

  return { safe: true, type: 'add-docs' };
}

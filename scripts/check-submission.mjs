#!/usr/bin/env node
/**
 * BobSprint — Submission integrity checker
 *
 * Checks:
 *   1. bob_sessions/README.md present
 *   2. At least one non-README markdown in bob_sessions/ (exported task history)
 *   3. benchmark.md present
 *   4. node_modules/ in .gitignore
 *   5. .env* patterns in .gitignore
 *   6. No credential patterns in tracked files
 *
 * Exit 0 = clean. Exit 1 = one or more findings.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Credential patterns to reject ────────────────────────────────────────────
const CRED_PATTERNS = [
  /ghp_[A-Za-z0-9]{36}/,           // GitHub PAT (classic)
  /github_pat_[A-Za-z0-9_]{82}/,   // GitHub PAT (fine-grained)
  /sk-[A-Za-z0-9]{20,}/,           // OpenAI-style key
  /AKIA[0-9A-Z]{16}/,              // AWS access key
  /AIza[0-9A-Za-z-_]{35}/,         // Google API key
];

// Files/dirs to skip entirely
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'test-results']);
const SKIP_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.pdf', '.zip']);
// Lock files contain SHA-512 integrity hashes that look like base64 — not credentials
const SKIP_BASENAMES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);

// ── Helpers ───────────────────────────────────────────────────────────────────

let findings = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  findings++;
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}

function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
  }
}

// ── Check 1: bob_sessions structure ──────────────────────────────────────────

console.log('\nCheck 1 — bob_sessions/ structure');

const sessionsDir = path.join(ROOT, 'bob_sessions');
const sessionsReadme = path.join(sessionsDir, 'README.md');

if (!fs.existsSync(sessionsDir)) {
  fail('bob_sessions/ directory missing');
} else {
  if (fs.existsSync(sessionsReadme)) {
    pass('bob_sessions/README.md present');
  } else {
    fail('bob_sessions/README.md missing');
  }

  const mdFiles = fs.readdirSync(sessionsDir).filter(
    f => f.endsWith('.md') && f !== 'README.md'
  );
  if (mdFiles.length > 0) {
    pass(`bob_sessions/ has ${mdFiles.length} exported session file(s): ${mdFiles.join(', ')}`);
  } else {
    fail('bob_sessions/ has no exported Bob task history (need at least one .md beyond README.md)');
  }
}

// ── Check 2: benchmark.md present ────────────────────────────────────────────

console.log('\nCheck 2 — benchmark.md');

const benchmarkFile = path.join(ROOT, 'benchmark.md');
if (fs.existsSync(benchmarkFile)) {
  const content = fs.readFileSync(benchmarkFile, 'utf8');
  if (content.trim().length > 100) {
    pass('benchmark.md present and non-empty');
  } else {
    fail('benchmark.md present but appears to be a placeholder (< 100 chars)');
  }
} else {
  fail('benchmark.md missing — run: pnpm benchmark');
}

// ── Check 3: .gitignore coverage ─────────────────────────────────────────────

console.log('\nCheck 3 — .gitignore coverage');

const gitignorePath = path.join(ROOT, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  fail('.gitignore missing');
} else {
  const gi = fs.readFileSync(gitignorePath, 'utf8');
  const lines = gi.split('\n').map(l => l.trim());

  if (lines.some(l => l === 'node_modules' || l === 'node_modules/' || l === '/node_modules' || l === '/node_modules/')) {
    pass('node_modules/ is gitignored');
  } else {
    fail('node_modules/ is NOT in .gitignore');
  }

  if (lines.some(l => l.includes('.env'))) {
    pass('.env* patterns covered in .gitignore');
  } else {
    fail('.env* not in .gitignore');
  }
}

// ── Check 4: No credentials in tracked files ─────────────────────────────────

console.log('\nCheck 4 — Credential scan');

// Get list of git-tracked files to avoid scanning .gitignored content
let trackedFiles;
try {
  const output = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
  trackedFiles = new Set(output.trim().split('\n').map(f => path.resolve(ROOT, f)));
} catch {
  warn('Could not run git ls-files — scanning all non-ignored files instead');
  trackedFiles = null;
}

let scannedCount = 0;
let credFindings = 0;

for (const file of walkFiles(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (SKIP_EXTS.has(ext)) continue;
  if (trackedFiles && !trackedFiles.has(file)) continue;

  const basename = path.basename(file);
  if (SKIP_BASENAMES.has(basename)) continue;

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue; // binary or unreadable
  }

  scannedCount++;
  const rel = path.relative(ROOT, file);

  for (const pattern of CRED_PATTERNS) {
    // Skip the pattern file itself
    if (rel === 'scripts/check-submission.mjs') continue;
    const match = content.match(pattern);
    if (match) {
      // Extra filter: base64 blobs under 50 chars are normal in CSS/fonts
      if (pattern.source.includes('40,') && match[0].length < 50) continue;
      fail(`Credential pattern found in ${rel}: matches /${pattern.source}/`);
      credFindings++;
    }
  }
}

if (credFindings === 0) {
  pass(`Scanned ${scannedCount} files — no credential patterns found`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
if (findings === 0) {
  console.log('✓ All checks passed — submission is clean.\n');
  process.exit(0);
} else {
  console.error(`✗ ${findings} finding(s) — resolve before submitting.\n`);
  process.exit(1);
}

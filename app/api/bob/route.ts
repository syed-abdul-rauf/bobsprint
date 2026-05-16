// Next.js API route — wraps IBM Bob Shell CLI.
// Requires `bob` to be installed and authenticated (`bob login`).
// Must run in Node.js runtime (not Edge) so child_process.spawn is available.
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import type { ChildProcessWithoutNullStreams } from 'child_process';

import nodePath from 'node:path';
import nodeFs from 'node:fs';

// ── Bob binary resolution ─────────────────────────────────────────────────────
// On Windows, npm global installs a .cmd wrapper that cannot be spawned with
// shell:false. We resolve the actual Node.js entry point instead.
// BOB_COMMAND env var overrides all resolution (useful for non-standard installs).

const WIN_BOB_ENTRY = process.env.APPDATA
  ? nodePath.join(process.env.APPDATA, 'npm', 'node_modules', 'bobshell', 'bundle', 'bob.js')
  : null;

function resolveBobPath(): { exists: boolean; path: string | null } {
  if (process.env.BOB_COMMAND) {
    const exists = nodeFs.existsSync(process.env.BOB_COMMAND);
    return { exists, path: exists ? process.env.BOB_COMMAND : null };
  }
  if (process.platform === 'win32' && WIN_BOB_ENTRY) {
    const exists = nodeFs.existsSync(WIN_BOB_ENTRY);
    return { exists, path: exists ? WIN_BOB_ENTRY : null };
  }
  // Non-Windows: 'bob' must be on PATH — check common locations
  const candidates = ['/usr/local/bin/bob', '/usr/bin/bob', `${process.env.HOME ?? ''}/.npm-global/bin/bob`];
  for (const c of candidates) {
    if (nodeFs.existsSync(c)) return { exists: true, path: c };
  }
  // Cannot confirm bob is on PATH — treat as not found
  return { exists: false, path: null };
}

function resolveBobEntry(): { cmd: string; prependArgs: string[] } {
  if (process.env.BOB_COMMAND) return { cmd: process.env.BOB_COMMAND, prependArgs: [] };
  if (process.platform === 'win32' && WIN_BOB_ENTRY && nodeFs.existsSync(WIN_BOB_ENTRY)) {
    return { cmd: process.execPath, prependArgs: [WIN_BOB_ENTRY] };
  }
  return { cmd: 'bob', prependArgs: [] };
}

const { cmd: BOB_CMD, prependArgs: BOB_PREFIX_ARGS } = resolveBobEntry();
const ACCEPT_LICENSE = process.env.BOB_ACCEPT_LICENSE !== '0';
// Per-invocation Bobcoin cap (bob exits 1 if exceeded). Tune via BOB_MAX_COINS env var.
const BOB_MAX_COINS = process.env.BOB_MAX_COINS ? parseFloat(process.env.BOB_MAX_COINS) : undefined;

// bob --chat-mode flag values (confirmed from bob --help, v1.0.3)
const CHAT_MODE_MAP: Record<string, string> = {
  Plan: 'plan',
  Ask: 'ask',
  Code: 'code',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface BobShellResult {
  ok: boolean;
  output: string;
  stderr: string;
  durationMs: number;
  exitCode: number;
  costEstimate?: number;
  budgetSpend?: number;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

const BOB_RELAY_URL = process.env.BOB_RELAY_URL?.replace(/\/$/, '');

export async function GET() {
  if (BOB_RELAY_URL) {
    try {
      const res = await fetch(`${BOB_RELAY_URL}/api/bob`);
      return NextResponse.json(await res.json());
    } catch {
      return NextResponse.json({ available: false, reason: 'relay_unreachable' });
    }
  }
  const { exists, path: resolvedPath } = resolveBobPath();
  if (!exists) {
    return NextResponse.json({ available: false, reason: 'binary_not_found' });
  }
  return NextResponse.json({ available: true, version: '1.0.3', path: resolvedPath });
}

export async function POST(request: NextRequest) {
  let body: { prompt?: unknown; mode?: unknown; timeoutMs?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { prompt, mode, timeoutMs = 120_000 } = body;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  if (BOB_RELAY_URL) {
    try {
      const relayTimeout = typeof timeoutMs === 'number' ? timeoutMs : 120_000;
      const res = await fetch(`${BOB_RELAY_URL}/api/bob`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, timeoutMs: relayTimeout }),
        signal: AbortSignal.timeout(relayTimeout + 5_000),
      });
      const text = await res.text();
      try {
        return NextResponse.json(JSON.parse(text));
      } catch {
        return NextResponse.json({ ok: false, output: '', stderr: `VPS returned non-JSON: ${text.slice(0, 200)}`, durationMs: 0, exitCode: -1 });
      }
    } catch (e) {
      return NextResponse.json({ ok: false, output: '', stderr: String(e), durationMs: 0, exitCode: -1 });
    }
  }

  const result = await runBob(
    prompt,
    typeof mode === 'string' ? mode : undefined,
    typeof timeoutMs === 'number' ? timeoutMs : 120_000,
  );

  return NextResponse.json(result);
}

// ── Bob spawn ─────────────────────────────────────────────────────────────────

async function runBob(
  prompt: string,
  mode: string | undefined,
  timeoutMs: number,
): Promise<BobShellResult> {
  return new Promise((resolve) => {
    const t0 = Date.now();

    // ── Build args ──────────────────────────────────────────────────────────
    // Flags confirmed from `bob --help` v1.0.3:
    //   --accept-license             Accept EULA non-interactively
    //   --approval-mode yolo         Auto-approve all tool calls (required: no TTY)
    //   --hide-intermediary-output   Suppress spinner; stdout = response text + JSON stats
    //   --output-format json         Append JSON stats block to stdout (includes sessionCost)
    //   --chat-mode plan|ask|code    Set Bob's reasoning mode
    //   --max-coins N                Stop with exit 1 if budget exceeded
    //   <prompt>                     Positional prompt (-p deprecated in v1.0.3)
    const args: string[] = [];
    if (ACCEPT_LICENSE) args.push('--accept-license');
    args.push('--approval-mode', 'yolo');
    args.push('--hide-intermediary-output');
    args.push('--output-format', 'json');       // enables stats.sessionCost in stdout
    if (mode) {
      const chatMode = CHAT_MODE_MAP[mode];
      if (chatMode) args.push('--chat-mode', chatMode);
    }
    if (BOB_MAX_COINS && BOB_MAX_COINS > 0) args.push('--max-coins', String(BOB_MAX_COINS));
    args.push(prompt);

    let stdout = '';
    let stderr = '';

    // Use the project root as CWD so any @file references resolve correctly,
    // but Bob cannot write outside it even with --yolo.
    const proc: ChildProcessWithoutNullStreams = spawn(BOB_CMD, [...BOB_PREFIX_ARGS, ...args], {
      cwd: process.env.BOB_CWD ?? process.cwd(),
      env: { ...process.env, NODE_OPTIONS: '--require /tmp/strip-flag.js' },
      // shell:false so Node passes args directly — avoids Windows quote-escaping
      // issues with long prompt strings. Node handles arg marshalling for us.
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Close stdin immediately — prompt is passed via -p, not stdin.
    proc.stdin.end();

    const timer = setTimeout(() => proc.kill('SIGTERM'), timeoutMs);

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = Date.now() - t0;
      const exitCode = code ?? -1;
      const { response, stats } = parseBobOutput(stdout);
      resolve({
        ok: exitCode === 0,
        output: response,
        stderr,
        durationMs,
        exitCode,
        costEstimate: stats?.sessionCost,
        budgetSpend: stats?.budgetSpend,
      });
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        ok: false, output: '', stderr: err.message,
        durationMs: Date.now() - t0, exitCode: -1,
      });
    });
  });
}

// ── Output parsing ────────────────────────────────────────────────────────────
// Bob with --output-format json emits:
//   <response text as plain text>
//   {
//     "response": "",          ← always empty; text was already printed
//     "stats": {
//       "budgetSpend": 0.82,   ← cumulative Bobcoins used this session
//       "maxBudget": 40,       ← hackathon allocation
//       "sessionCost": 0.031   ← cost of THIS invocation
//     }
//   }
// We split on the last standalone `{` line to separate response from stats.

interface BobJsonStats {
  sessionCost?: number;
  budgetSpend?: number;
  maxBudget?: number;
}

function parseBobOutput(raw: string): { response: string; stats?: BobJsonStats } {
  const lines = raw.split('\n');
  let jsonStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '{') { jsonStart = i; break; }
  }
  if (jsonStart === -1) return { response: raw.trim() };

  const response = lines.slice(0, jsonStart).join('\n').trim();
  const jsonText = lines.slice(jsonStart).join('\n');
  try {
    const parsed = JSON.parse(jsonText) as { stats?: BobJsonStats };
    if (parsed?.stats) return { response, stats: parsed.stats };
  } catch { /* fall through */ }
  return { response: raw.trim() };
}

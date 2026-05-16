#!/usr/bin/env node
/**
 * BobSprint — Bob Bridge
 *
 * Loopback HTTP server (127.0.0.1:7335) that wraps IBM Bob Shell.
 * The Next.js frontend calls this bridge; the bridge spawns `bob` as a subprocess.
 *
 * Invocations are logged to bob_sessions/bridge.log:
 *   - command, args, mode, durationMs, exitCode, ok
 *   - prompt and response bodies are NEVER logged
 *
 * Usage:
 *   node scripts/bob-bridge.mjs
 *   BOB_MOCK=1 node scripts/bob-bridge.mjs
 *   BOB_BRIDGE_PORT=7336 node scripts/bob-bridge.mjs
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.BOB_BRIDGE_PORT ?? '7335', 10);
const HOST = '127.0.0.1';
const ALLOWED_ORIGIN = process.env.BOB_BRIDGE_ORIGIN ?? 'http://localhost:3000';
const MOCK = process.env.BOB_MOCK === '1';
// On Windows, resolve the Node.js entry point to avoid spawning .cmd with shell:false.
function resolveBobCommand() {
  if (process.env.BOB_COMMAND) return { cmd: process.env.BOB_COMMAND, prefix: [] };
  if (process.platform === 'win32' && process.env.APPDATA) {
    const entry = path.join(process.env.APPDATA, 'npm', 'node_modules', 'bobshell', 'bundle', 'bob.js');
    if (fs.existsSync(entry)) return { cmd: process.execPath, prefix: [entry] };
  }
  return { cmd: 'bob', prefix: [] };
}
const { cmd: BOB_COMMAND, prefix: BOB_PREFIX } = resolveBobCommand();
const BOB_MAX_COINS = process.env.BOB_MAX_COINS ? parseFloat(process.env.BOB_MAX_COINS) : undefined;
const PORT_FILE = path.join(ROOT, '.bob-bridge.port');

// bob --chat-mode flag values (confirmed from bob --help, v1.0.3)
const CHAT_MODE_MAP = { Plan: 'plan', Ask: 'ask', Code: 'code' };

const SESSIONS_DIR = path.join(ROOT, 'bob_sessions');
const LOG_FILE = path.join(SESSIONS_DIR, 'bridge.log');

// ── Directory setup ──────────────────────────────────────────────────────────

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ── Invocation logger ────────────────────────────────────────────────────────
// Logs command metadata only — never the prompt or response bodies.

function logInvocation(record) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n';
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch {
    // Non-fatal: don't crash the bridge if the log file is unavailable.
  }
}

// ── CORS ─────────────────────────────────────────────────────────────────────

function setCorsHeaders(res, origin) {
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Body parser ───────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ── Mock responses ────────────────────────────────────────────────────────────
// Used when BOB_MOCK=1. Delays simulate real Bob latency so the UI animations
// play naturally during demos.

const MOCK_DELAY_MS = 1_500;

function detectLangFromPrompt(prompt) {
  const m = prompt.match(/[Ff]ile to create:\s*(\S+)/) ??
            prompt.match(/targetPath['":\s]+([^\n"',}\s]+)/);
  if (!m) return 'text';
  const ext = path.extname(m[1]).toLowerCase();
  if (ext === '.py') return 'python';
  if (['.ts', '.tsx'].includes(ext)) return 'typescript';
  if (['.js', '.jsx', '.mjs'].includes(ext)) return 'javascript';
  if (['.md', '.mdx'].includes(ext)) return 'markdown';
  return 'text';
}

const MOCK_OUTPUTS = {
  plan: JSON.stringify([
    {
      type: 'add-tests',
      targetPath: 'tests/test_main.py',
      description: 'Basic smoke tests for the primary application entry point',
    },
    {
      type: 'add-docs',
      targetPath: 'docs/SETUP.md',
      description: 'Local development setup guide covering env vars and common errors',
    },
    {
      type: 'add-readme-section',
      targetPath: 'README.md',
      description: 'Add architecture overview and quick-start sections',
    },
  ]),

  ask: `\
• This codebase is a web application combining a backend API with a frontend UI layer.
• Health: needs-work — missing test coverage and incomplete documentation are the primary risks.
• Most important gap: no automated test suite; every change ships unverified.
• Top action: add smoke tests for the critical API endpoints before any refactoring.
• Sprint readiness: not ready — missing tests and setup documentation are blockers.`,

  code: {
    python: `"""Auto-generated smoke tests (BobSprint mock mode)."""
import pytest


def test_placeholder():
    """Replace with real assertions once the entry point is confirmed."""
    assert True
`,
    typescript: `// Auto-generated by BobSprint (mock mode)
import { describe, it, expect } from 'vitest';

describe('placeholder', () => {
  it('passes', () => {
    expect(true).toBe(true);
  });
});
`,
    javascript: `// Auto-generated by BobSprint (mock mode)
describe('placeholder', () => {
  it('passes', () => {
    expect(true).toBe(true);
  });
});
`,
    markdown: `# Setup

## Prerequisites

- Node.js 18+

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
    text: '# Auto-generated placeholder (BobSprint mock mode)\n',
  },
};

function getMockOutput(prompt, mode) {
  const m = (mode ?? '').toLowerCase();
  if (m === 'plan' || (!m && /json array/i.test(prompt))) {
    return MOCK_OUTPUTS.plan;
  }
  if (m === 'code' || /file to create/i.test(prompt)) {
    const lang = detectLangFromPrompt(prompt);
    return MOCK_OUTPUTS.code[lang] ?? MOCK_OUTPUTS.code.text;
  }
  return MOCK_OUTPUTS.ask;
}

// Parses bob --output-format json stdout: splits response text from trailing stats block.
// Stats block always starts with a standalone `{` line (last occurrence).
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

async function runMock(prompt, mode) {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  const durationMs = Date.now() - start;
  logInvocation({ command: 'bob', args: [], mode: mode ?? null, durationMs, exitCode: 0, ok: true, mock: true });
  return {
    ok: true,
    output: getMockOutput(prompt, mode),
    stderr: '',
    durationMs,
    exitCode: 0,
    costEstimate: 0,
  };
}

// ── Real Bob spawn ────────────────────────────────────────────────────────────
// TODO(bob-shell-flags): exact CLI surface unknown until user pastes `bob --help`.
// Do NOT enable this code path (remove BOB_MOCK=1) until Stage 7 confirms flags.
// Placeholder: sends prompt via stdin, no mode flags.

async function runBob(prompt, mode, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';

    // Flags confirmed from `bob --help` v1.0.3:
    //   --approval-mode yolo        Auto-approve all tool calls (no TTY in subprocess)
    //   --hide-intermediary-output  Clean stdout; only final output + JSON stats
    //   --output-format json        Append stats block to stdout (includes sessionCost)
    //   --chat-mode plan|ask|code   Bob reasoning mode
    //   --max-coins N               Per-invocation Bobcoin cap
    //   <prompt>                    Positional (-p deprecated in v1.0.3)
    const args = ['--accept-license', '--approval-mode', 'yolo', '--hide-intermediary-output', '--output-format', 'json'];
    if (mode && CHAT_MODE_MAP[mode]) args.push('--chat-mode', CHAT_MODE_MAP[mode]);
    if (BOB_MAX_COINS && BOB_MAX_COINS > 0) args.push('--max-coins', String(BOB_MAX_COINS));
    args.push(prompt);

    const proc = spawn(BOB_COMMAND, [...BOB_PREFIX, ...args], {
      cwd: process.env.BOB_CWD ?? ROOT,
      env: { ...process.env },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => proc.kill('SIGTERM'), timeoutMs ?? 120_000);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.stdin.end();

    proc.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const exitCode = code ?? -1;
      const { response, stats } = parseBobOutput(stdout);
      logInvocation({
        command: BOB_COMMAND,
        args,
        mode: mode ?? null,
        durationMs,
        exitCode,
        ok: exitCode === 0,
        costEstimate: stats?.sessionCost ?? null,
        budgetSpend: stats?.budgetSpend ?? null,
      });
      resolve({ ok: exitCode === 0, output: response, stderr, durationMs, exitCode, costEstimate: stats?.sessionCost });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      logInvocation({
        command: BOB_COMMAND,
        args,
        mode: mode ?? null,
        durationMs,
        exitCode: -1,
        ok: false,
        spawnError: err.message,
      });
      resolve({ ok: false, output: '', stderr: err.message, durationMs, exitCode: -1 });
    });
  });
}

async function runBobStream(res, prompt, mode, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stderr = '';

    // Same args as runBob — streaming output written line-by-line as SSE.
    const args = ['--accept-license', '--approval-mode', 'yolo', '--hide-intermediary-output', '--output-format', 'json'];
    if (mode && CHAT_MODE_MAP[mode]) args.push('--chat-mode', CHAT_MODE_MAP[mode]);
    if (BOB_MAX_COINS && BOB_MAX_COINS > 0) args.push('--max-coins', String(BOB_MAX_COINS));
    args.push(prompt);

    const proc = spawn(BOB_COMMAND, [...BOB_PREFIX, ...args], {
      cwd: process.env.BOB_CWD ?? ROOT,
      env: { ...process.env },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => proc.kill('SIGTERM'), timeoutMs ?? 120_000);

    proc.stdout.on('data', (d) => {
      if (!res.destroyed) res.write(`data: ${d.toString()}\n\n`);
    });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.stdin.end();

    const finish = (code) => {
      clearTimeout(timer);
      logInvocation({
        command: BOB_COMMAND,
        args,
        mode: mode ?? null,
        durationMs: Date.now() - start,
        exitCode: code ?? -1,
        ok: code === 0,
        streaming: true,
      });
      resolve();
    };

    proc.on('close', finish);
    proc.on('error', (err) => {
      clearTimeout(timer);
      logInvocation({
        command: BOB_COMMAND,
        args,
        mode: mode ?? null,
        durationMs: Date.now() - start,
        exitCode: -1,
        ok: false,
        streaming: true,
        spawnError: err.message,
      });
      resolve();
    });
  });
}

// ── Request handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'] ?? '';
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let url;
  try {
    url = new URL(req.url, `http://${HOST}:${PORT}`);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  // GET /health ────────────────────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/health') {
    let bobAvailable = MOCK;
    if (!MOCK) {
      bobAvailable = await new Promise((resolve) => {
        const p = spawn(BOB_COMMAND, ['--version'], { stdio: 'ignore' });
        const t = setTimeout(() => { p.kill(); resolve(false); }, 3_000);
        p.on('close', (code) => { clearTimeout(t); resolve(code === 0); });
        p.on('error', () => { clearTimeout(t); resolve(false); });
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, bobAvailable, mock: MOCK }));
    return;
  }

  // POST /run ──────────────────────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/run') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const { prompt, mode, timeoutMs } = body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'prompt is required' }));
      return;
    }

    const result = MOCK
      ? await runMock(prompt, mode)
      : await runBob(prompt, mode, timeoutMs);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // POST /run/stream ────────────────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/run/stream') {
    let body;
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const { prompt, mode, timeoutMs } = body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'prompt is required' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    if (MOCK) {
      const output = getMockOutput(prompt, mode);
      // Simulate token-by-token streaming at ~60ms/word for visual feedback.
      for (const word of output.split(' ')) {
        if (res.destroyed) break;
        await new Promise((r) => setTimeout(r, 60));
        res.write(`data: ${word} \n\n`);
      }
    } else {
      await runBobStream(res, prompt, mode, timeoutMs);
    }

    if (!res.destroyed) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
  try { fs.writeFileSync(PORT_FILE, String(PORT), 'utf8'); } catch { /* non-fatal */ }
  console.log(`Bob Bridge  ${HOST}:${PORT}  mock=${MOCK}`);
  console.log(`Log         ${path.relative(ROOT, LOG_FILE)}`);
  if (MOCK) {
    console.log('BOB_MOCK=1 — canned responses, no Bob Shell invocations');
  } else {
    console.log(`Bob command: ${BOB_COMMAND}  (override with BOB_COMMAND env var)`);
    console.warn('WARNING: real Bob spawn path is not yet wired (TODO: bob-shell-flags)');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Is another bridge running?`);
    console.error(`Kill it or set BOB_BRIDGE_PORT to a different value.`);
  } else {
    console.error('Bridge error:', err.message);
  }
  process.exit(1);
});

// ── Shutdown ─────────────────────────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\nBob Bridge shutting down (${signal})…`);
  server.close(() => {
    try { fs.unlinkSync(PORT_FILE); } catch { /* already gone */ }
    process.exit(0);
  });
  // Force-exit after 3s if connections are lingering.
  setTimeout(() => process.exit(0), 3_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

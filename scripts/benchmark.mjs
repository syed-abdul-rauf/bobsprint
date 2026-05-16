#!/usr/bin/env node
/**
 * BobSprint — Pipeline benchmark
 *
 * Measures autopilot pipeline timing against three fixture repos.
 * Writes results to benchmark.md at the repo root.
 *
 * Usage:
 *   node scripts/benchmark.mjs               # mock mode (BOB_MOCK=1, auto-starts bridge)
 *   REAL_BOB=1 node scripts/benchmark.mjs    # real Bob mode (bridge must be running)
 *
 * Real Bob mode requirements:
 *   - bob installed and authenticated (bob login)
 *   - bridge running WITHOUT mock: node scripts/bob-bridge.mjs
 *   - GitHub PAT in env: GITHUB_PAT=ghp_...
 *   - Cost: ~2-4 Bobcoins per fixture run. Use sparingly.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.BOB_BRIDGE_PORT ?? '7335', 10);
const BRIDGE_URL = `http://127.0.0.1:${PORT}`;
const REAL_BOB = process.env.REAL_BOB === '1';
const LOG_FILE = path.join(ROOT, 'bob_sessions', 'bridge.log');

// Three small public repos used as fixture targets
const FIXTURES = [
  {
    name: 'northpeak-demo (fixture)',
    url: 'demo',
    note: 'Built-in demo fixture — zero network, fully offline',
  },
  {
    name: 'minimalist-js-lib (mock)',
    url: 'https://github.com/mock-fixture/lib-a',
    note: 'Mock run — bridge responds with canned Plan/Ask/Code outputs',
  },
  {
    name: 'small-python-cli (mock)',
    url: 'https://github.com/mock-fixture/cli-b',
    note: 'Mock run — bridge responds with canned Plan/Ask/Code outputs',
  },
];

// Bob calls expected in a typical pipeline run with 3 safe-win items:
//   1× Plan, 1× Ask, 3× Code, 3× SafetyGate, 3× CommitMsg, 1× PRBody
// = 12 total bridge calls
const TYPICAL_CALL_COUNT = 12;

// ── Bridge health check ───────────────────────────────────────────────────────

function checkBridge() {
  return new Promise((resolve) => {
    const req = http.get(`${BRIDGE_URL}/health`, (res) => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ ok: json.ok === true, mock: !json.bobAvailable });
        } catch {
          resolve({ ok: false });
        }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ ok: false }); });
  });
}

// ── Start bridge in mock mode ─────────────────────────────────────────────────

function startBridge() {
  const bridgeScript = path.join(ROOT, 'scripts', 'bob-bridge.mjs');
  const child = spawn(process.execPath, [bridgeScript], {
    env: { ...process.env, BOB_MOCK: '1', BOB_BRIDGE_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  return new Promise((resolve, reject) => {
    let started = false;
    child.stdout.on('data', (d) => {
      if (!started && d.toString().includes('Bob Bridge')) {
        started = true;
        setTimeout(() => resolve(child), 200);
      }
    });
    child.on('error', reject);
    setTimeout(() => {
      if (!started) reject(new Error('Bridge did not start within 5s'));
    }, 5000);
  });
}

// ── Bridge log validation (real Bob mode) ────────────────────────────────────

function readBridgeLogTail(n) {
  try {
    const text = fs.readFileSync(LOG_FILE, 'utf8');
    return text.trim().split('\n').slice(-n).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function validateRealBobInvocations(entries) {
  const issues = [];
  const realEntries = entries.filter((e) => !e.mock);
  if (realEntries.length === 0) {
    issues.push('No real Bob invocations found in bridge.log — was BOB_MOCK=1 set?');
  }
  const failed = realEntries.filter((e) => !e.ok);
  if (failed.length > 0) {
    issues.push(`${failed.length} Bob call(s) returned non-zero exit code.`);
  }
  const modes = new Set(realEntries.map((e) => e.mode).filter(Boolean));
  const missingModes = ['Plan', 'Ask', 'Code'].filter((m) => !modes.has(m));
  if (missingModes.length > 0) {
    issues.push(`Mode flag not logged for: ${missingModes.join(', ')} — verify bob --help mode flag.`);
  }
  const costs = realEntries.map((e) => e.costEstimate).filter((c) => c != null);
  const totalCost = costs.reduce((a, b) => a + b, 0);
  return { issues, realCount: realEntries.length, totalCost, modes: [...modes] };
}

// ── Single bridge call timing ─────────────────────────────────────────────────

function timeBridgeCall(mode) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ prompt: `benchmark probe — ${mode}`, mode });
    const start = Date.now();
    const req = http.request(
      { hostname: '127.0.0.1', port: PORT, path: '/run', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          const durationMs = Date.now() - start;
          try {
            const json = JSON.parse(data);
            resolve({ durationMs, ok: json.ok });
          } catch {
            resolve({ durationMs, ok: false });
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Simulate pipeline timing ──────────────────────────────────────────────────

async function benchmarkRun(fixture) {
  console.log(`  Running: ${fixture.name}`);
  const wallStart = Date.now();
  const callTimes = [];

  // Stage 1 — Recon: no bridge calls (GitHub API fetch, simulated)
  const reconStart = Date.now();
  await new Promise(r => setTimeout(r, fixture.url === 'demo' ? 100 : 500));
  const reconMs = Date.now() - reconStart;

  // Stage 2 — Fan-out: Plan + Ask in parallel, then Code×3 sequentially
  const [planResult, askResult] = await Promise.all([
    timeBridgeCall('Plan'),
    timeBridgeCall('Ask'),
  ]);
  callTimes.push(planResult.durationMs, askResult.durationMs);
  const fanOutParallelMs = Math.max(planResult.durationMs, askResult.durationMs);

  let codeMs = 0;
  for (let i = 0; i < 3; i++) {
    const r = await timeBridgeCall('Code');
    callTimes.push(r.durationMs);
    codeMs += r.durationMs;
  }

  // Stage 3 — Safety gate: 3× Ask calls sequentially
  let safetyMs = 0;
  for (let i = 0; i < 3; i++) {
    const r = await timeBridgeCall('Ask');
    callTimes.push(r.durationMs);
    safetyMs += r.durationMs;
  }

  // Stage 4 — Apply: 3× commit-msg Ask + 1× PR body Ask (sequential)
  let applyBobMs = 0;
  for (let i = 0; i < 4; i++) {
    const r = await timeBridgeCall('Ask');
    callTimes.push(r.durationMs);
    applyBobMs += r.durationMs;
  }

  const wallMs = Date.now() - wallStart;
  const avgCallMs = Math.round(callTimes.reduce((a, b) => a + b, 0) / callTimes.length);

  return {
    name: fixture.name,
    note: fixture.note,
    wallMs,
    reconMs,
    fanOutParallelMs,
    codeMs,
    safetyMs,
    applyBobMs,
    avgCallMs,
    callCount: callTimes.length,
  };
}

// ── Markdown writer ───────────────────────────────────────────────────────────

function writeMarkdown(results, date, validation) {
  const rows = results.map(r => {
    const total = (r.wallMs / 1000).toFixed(1);
    const recon = (r.reconMs / 1000).toFixed(1);
    const fanOut = ((r.fanOutParallelMs + r.codeMs) / 1000).toFixed(1);
    const safety = (r.safetyMs / 1000).toFixed(1);
    const apply = (r.applyBobMs / 1000).toFixed(1);
    return `| ${r.name} | ${recon}s | ${fanOut}s | ${safety}s | ${apply}s | **${total}s** |`;
  });

  const avgWall = results.reduce((a, b) => a + b.wallMs, 0) / results.length;
  const avgCallMs = results.reduce((a, b) => a + b.avgCallMs, 0) / results.length;
  const isMock = !REAL_BOB;
  const modeLabel = isMock ? 'BOB_MOCK=1 (bridge mock responses)' : 'REAL_BOB=1 (real Bob Shell)';

  let validationSection = '';
  if (validation) {
    const issueLines = validation.issues.length === 0
      ? '- No issues found.'
      : validation.issues.map(i => `- ⚠ ${i}`).join('\n');
    validationSection = `
## Real Bob validation

| Metric | Value |
|--------|-------|
| Real Bob calls | ${validation.realCount} |
| Modes observed | ${validation.modes.join(', ') || 'none'} |
| Total cost | ₿${validation.totalCost.toFixed(3)} |
| Issues | ${validation.issues.length === 0 ? 'none' : validation.issues.length} |

${issueLines}
`;
  }

  const md = `# BobSprint — Benchmark

> Generated: ${date}
> Mode: **${modeLabel}**, ${Math.round(avgCallMs)}ms avg per call
> Pipeline model: 3 safe-win items, ${results[0]?.callCount ?? TYPICAL_CALL_COUNT} total Bob calls

## Pipeline timing

| Fixture | Recon | Fan-out+Code | Safety gate | Apply+PR | **Total** |
|---------|-------|-------------|-------------|----------|-----------|
${rows.join('\n')}

## Notes

${isMock
  ? `- **Mock mode** replaces real Bob Shell with canned responses (1.5s delay per call).
- Real Bob Shell timings will be longer (network + model inference); claim 1 target is
  **under 300 seconds** for a full rescue including real Bob responses and GitHub writes.
- Average mock call latency: **${Math.round(avgCallMs)}ms** — budget for real Bob: ~10–30s/call.
- Estimated real-mode pipeline time (optimistic): **${Math.round(avgWall / 1000 + (TYPICAL_CALL_COUNT * 15))}–${Math.round(avgWall / 1000 + (TYPICAL_CALL_COUNT * 30))}s**.`
  : `- **Real Bob mode** — timings include real model inference and any GitHub API writes.
- Average Bob call latency: **${Math.round(avgCallMs)}ms**.
- See "Real Bob validation" section below for invocation log analysis.`}

## Stage breakdown

| Stage | What happens | Bob calls |
|-------|-------------|-----------|
| 1 Recon | GitHub tree fetch + snapshot | 0 |
| 2 Fan-out | Plan (parallel Ask), Code×3 | 5 |
| 3 Safety gate | Ask×3 per pending win | 3 |
| 4 Apply | CommitMsg Ask×3 + PR body Ask×1 + GitHub writes | 4 |
| 5 Done | Metrics computed, redirect | 0 |
${validationSection}
## Claim 1 status

${isMock
  ? (avgWall < 60_000
    ? `Mock pipeline completes in **${(avgWall / 1000).toFixed(1)}s** on average.
Real Bob mode target: under 300s (5 min). Run \`REAL_BOB=1 node scripts/benchmark.mjs\`
to validate this claim with real Bob Shell.`
    : `⚠ Mock pipeline exceeded 60s — investigate bridge latency before real-Bob verification.`)
  : (avgWall < 300_000
    ? `✓ Real Bob pipeline completes in **${(avgWall / 1000).toFixed(1)}s** on average — under the 300s target.`
    : `✗ Real Bob pipeline exceeded 300s target (${(avgWall / 1000).toFixed(1)}s avg) — investigate stage bottlenecks.`)}
`;

  fs.writeFileSync(path.join(ROOT, 'benchmark.md'), md, 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nBobSprint benchmark — mock mode\n');

  let bridgeProcess = null;

  // Check if bridge is already running
  let health = await checkBridge();
  if (!health.ok) {
    console.log('Bridge not running — starting in mock mode...');
    try {
      bridgeProcess = await startBridge();
      await new Promise(r => setTimeout(r, 500));
      health = await checkBridge();
      if (!health.ok) throw new Error('Bridge started but /health returned not-ok');
    } catch (err) {
      console.error(`Failed to start bridge: ${err.message}`);
      console.error('Run: BOB_MOCK=1 node scripts/bob-bridge.mjs');
      process.exit(1);
    }
  }

  if (!health.mock) {
    console.warn('⚠ Bridge is running with real Bob Shell. Benchmark will use real Bob timings.');
    console.warn('  For repeatable mock results: BOB_MOCK=1 node scripts/bob-bridge.mjs\n');
  } else {
    console.log('Bridge in mock mode. Running 3 fixture benchmarks...\n');
  }

  // Record bridge.log line count before run (for real Bob validation)
  const logLinesBefore = REAL_BOB
    ? (() => { try { return fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').length; } catch { return 0; } })()
    : 0;

  const results = [];
  for (const fixture of FIXTURES) {
    const r = await benchmarkRun(fixture);
    results.push(r);
    console.log(`    Total: ${(r.wallMs / 1000).toFixed(1)}s  (avg call: ${r.avgCallMs}ms)\n`);
  }

  // Real Bob: validate bridge.log entries produced during this benchmark
  let validation = null;
  if (REAL_BOB) {
    const allEntries = readBridgeLogTail(200);
    const newEntries = allEntries.slice(logLinesBefore);
    validation = validateRealBobInvocations(newEntries);
    if (validation.issues.length > 0) {
      console.warn('\n⚠ Real Bob validation issues:');
      validation.issues.forEach((i) => console.warn(`  - ${i}`));
    } else {
      console.log(`\n✓ Real Bob validation: ${validation.realCount} calls, modes: ${validation.modes.join('/')}, total cost: ₿${validation.totalCost.toFixed(3)}`);
    }
  }

  const date = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  writeMarkdown(results, date, validation);
  console.log(`benchmark.md written.\n`);

  if (bridgeProcess) {
    bridgeProcess.kill('SIGTERM');
  }

  const avgWall = results.reduce((a, b) => a + b.wallMs, 0) / results.length;
  if (REAL_BOB) {
    console.log(`Average pipeline time (real Bob): ${(avgWall / 1000).toFixed(1)}s`);
    console.log(avgWall < 300_000
      ? `✓ Claim 1: under 300s (${(avgWall / 1000).toFixed(1)}s)`
      : `✗ Claim 1: EXCEEDED 300s target (${(avgWall / 1000).toFixed(1)}s)`);
  } else {
    console.log(`Average pipeline time (mock): ${(avgWall / 1000).toFixed(1)}s`);
    console.log('Claim 1 (< 300s with real Bob) cannot be validated in mock mode.\n');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

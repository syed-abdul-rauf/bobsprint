#!/usr/bin/env node
/**
 * BobSprint route smoke test.
 *
 * Hits every public route on the running dev/prod server and asserts each
 * returns HTTP 200. Exits non-zero on any failure so CI can gate on it.
 *
 * Usage:
 *   npm run smoke                       # uses http://localhost:3000
 *   BASE_URL=http://localhost:3030 npm run smoke
 */

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const ROUTES = [
  '/',
  '/run',
  '/evidence',
  '/report',
];

const TIMEOUT_MS = 30_000;
const PREFLIGHT_TIMEOUT_MS = 10_000;
const PREFLIGHT_RETRIES = 3;

async function check(route) {
  const url = `${BASE}${route}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    const elapsed = Date.now() - start;
    return { route, ok: res.status === 200, status: res.status, ms: elapsed };
  } catch (err) {
    return { route, ok: false, status: 0, ms: Date.now() - start, error: err?.message || String(err) };
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  console.log(`Smoke-testing ${ROUTES.length} routes against ${BASE}`);
  console.log('');

  // Pre-flight: is the server even up? Retry a few times because the dev
  // server may still be compiling the first request.
  let reachable = false;
  for (let i = 0; i < PREFLIGHT_RETRIES; i++) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS) });
      if (res.status > 0) {
        reachable = true;
        break;
      }
    } catch {
      // retry
    }
    if (i < PREFLIGHT_RETRIES - 1) {
      console.log(`  preflight attempt ${i + 1} timed out — retrying…`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (!reachable) {
    console.error(`✗ Server is not reachable at ${BASE}`);
    console.error('  Start it first with `npm run dev` (port 3000) or set BASE_URL.');
    process.exit(2);
  }

  const results = await Promise.all(ROUTES.map(check));
  let failed = 0;
  for (const r of results) {
    const tag = r.ok ? '✓' : '✗';
    const status = r.status || 'ERR';
    const ms = `${r.ms}ms`.padStart(7);
    const note = r.error ? `  (${r.error})` : '';
    console.log(`  ${tag}  ${String(status).padEnd(4)} ${ms}  ${r.route}${note}`);
    if (!r.ok) failed += 1;
  }

  console.log('');
  if (failed === 0) {
    console.log(`All ${ROUTES.length} routes returned 200 ✓`);
    process.exit(0);
  } else {
    console.error(`${failed} of ${ROUTES.length} routes failed ✗`);
    process.exit(1);
  }
})();

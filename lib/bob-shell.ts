// Browser-safe Bob Shell client.
// Calls /api/bob (Next.js route → IBM Bob Shell CLI) instead of a local bridge.
//
// The browser POSTs Bob calls directly to the VPS relay (Cloudflare tunnel) to
// bypass Vercel's 10s serverless function timeout — Bob runs take 2–5 minutes.
//
// The relay URL is resolved at RUNTIME from GET /api/bob's `relay` field, not
// baked in at build time. This means a cloudflared tunnel restart (URL changes,
// no uptime guarantee) only needs a Vercel server-env update — no rebuild — and
// already-loaded browser tabs self-heal on their next run. The build-time
// NEXT_PUBLIC_BOB_RELAY_URL is kept only as a last-resort fast-path fallback.

import type { BobShellResult } from './types';

export interface BobRunOptions {
  mode?: 'Plan' | 'Ask' | 'Code';
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Strip a leading BOM/zero-width char + stray quotes/slashes that env tooling
 *  sometimes injects, so the URL we fetch is always well-formed. */
function cleanUrl(v: string | undefined | null): string {
  let s = v ?? '';
  while (s.length && (s.charCodeAt(0) === 0xfeff || s.charCodeAt(0) === 0x200b)) {
    s = s.slice(1);
  }
  return s.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
}

const BUILD_TIME_RELAY = cleanUrl(process.env.NEXT_PUBLIC_BOB_RELAY_URL);

// Resolved once per session: the current relay base URL ('' = call Vercel directly).
let relayResolution: Promise<string> | null = null;

/**
 * Resolves the relay base URL at runtime. GET /api/bob (always served by Vercel
 * via the relative path) returns `relay` when BOB_RELAY_URL is configured —
 * that value is the live Cloudflare tunnel. Falls back to the build-time env,
 * then to '' (POST straight to Vercel) so local dev keeps working.
 */
function resolveRelay(signal?: AbortSignal): Promise<string> {
  if (relayResolution) return relayResolution;
  relayResolution = (async () => {
    try {
      const res = await fetch('/api/bob', { method: 'GET', signal });
      if (res.ok) {
        const data = (await res.json()) as { available?: boolean; relay?: string };
        const relay = cleanUrl(data.relay);
        if (relay) return relay;
      }
    } catch {
      /* fall through to build-time fallback */
    }
    return BUILD_TIME_RELAY;
  })();
  return relayResolution;
}

/** Returns true if Bob is available (binary on disk locally, or a relay is configured). */
export async function isBobBridgeAvailable(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch('/api/bob', { method: 'GET', signal });
    if (!res.ok) return false;
    const data = await res.json();
    return data.available === true;
  } catch {
    return false;
  }
}

export async function runWithBob(
  prompt: string,
  opts: BobRunOptions = {},
): Promise<BobShellResult> {
  const { mode, timeoutMs = 120_000, signal } = opts;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });

  // Result type widened with an optional `relay` hint: the Vercel route returns
  // one when a stale client POSTs to it instead of the tunnel, letting us retry
  // directly against the live relay within the same call (self-healing).
  type Result = BobShellResult & { relay?: string };

  const attempt = async (endpoint: string): Promise<Result> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // A non-2xx HTML body means we hit a Next.js error page (e.g. a Vercel
      // 504 from the slow proxy path) instead of the relay. Surface a readable
      // reason instead of dumping the raw HTML document into the evidence trail.
      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text);
      const stderr = looksLikeHtml
        ? `Relay unreachable — got an HTML error page (HTTP ${res.status}). The Bob relay tunnel is likely down or its URL changed.`
        : text || `API returned ${res.status}`;
      return { ok: false, output: '', stderr, durationMs: 0, exitCode: res.status };
    }

    // SSE streaming response — keepalive comments keep proxies from timing out.
    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const ev of events) {
          const line = ev.trim();
          if (line.startsWith('data: ')) {
            try { return JSON.parse(line.slice(6)) as Result; } catch { /* incomplete */ }
          }
        }
      }
      return { ok: false, output: '', stderr: 'Stream ended without result', durationMs: 0, exitCode: -1 };
    }

    return (await res.json()) as Result;
  };

  try {
    const relay = await resolveRelay(signal);
    // POST goes direct to the VPS relay (bypasses Vercel's 10s timeout); when no
    // relay is configured (local dev) it falls back to the Vercel route itself.
    const first = await attempt(relay ? `${relay}/api/bob` : '/api/bob');

    // Self-heal: a stale client that POSTed to Vercel gets a `relay` hint back.
    // Retry once directly against it and cache it for the rest of the session.
    const hinted = cleanUrl(first.relay);
    if (!first.ok && !relay && hinted) {
      relayResolution = Promise.resolve(hinted);
      return await attempt(`${hinted}/api/bob`);
    }
    return first;
  } catch (err) {
    return {
      ok: false,
      output: '',
      stderr: err instanceof Error ? err.message : String(err),
      durationMs: 0,
      exitCode: -1,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Kept for compatibility — not used with the API route.
export async function* runWithBobStream(): AsyncGenerator<string> {
  // streaming not implemented for API route path
}

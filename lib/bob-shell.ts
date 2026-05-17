// Browser-safe Bob Shell client.
// Calls /api/bob (Next.js route → IBM Bob Shell CLI) instead of a local bridge.
// When NEXT_PUBLIC_BOB_RELAY_URL is set, calls the VPS directly from the browser
// to bypass Vercel's serverless function timeout limit.

import type { BobShellResult } from './types';

export interface BobRunOptions {
  mode?: 'Plan' | 'Ask' | 'Code';
  timeoutMs?: number;
  signal?: AbortSignal;
}

const RELAY = process.env.NEXT_PUBLIC_BOB_RELAY_URL?.replace(/\/$/, '') ?? '';
// POST calls go direct to VPS (bypasses Vercel timeout); GET check always via Vercel (no CORS needed).
const BOB_POST_ENDPOINT = RELAY ? `${RELAY}/api/bob` : '/api/bob';

/** Returns true if the bob binary exists on disk and is authenticated. */
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

  try {
    const res = await fetch(BOB_POST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        output: '',
        stderr: text || `API returned ${res.status}`,
        durationMs: 0,
        exitCode: res.status,
      };
    }

    return (await res.json()) as BobShellResult;
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

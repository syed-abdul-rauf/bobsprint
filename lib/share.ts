// Encodes a ReportSnapshot into a URL-hash-safe string and back. The snapshot
// rides in the URL fragment (#) so it is never sent to any server — fully
// client-side, offline, and private. Dependency-free UTF-8-safe base64url.

import type { ReportSnapshot } from './sprint-pack';

function b64urlEncode(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  return decodeURIComponent(escape(atob(b64 + pad)));
}

export function encodeSnapshot(snap: ReportSnapshot): string {
  return b64urlEncode(JSON.stringify(snap));
}

export function decodeSnapshot(hash: string): ReportSnapshot | null {
  try {
    const raw = hash.replace(/^#/, '');
    if (!raw) return null;
    const obj = JSON.parse(b64urlDecode(raw)) as ReportSnapshot;
    if (obj && obj.v === 1 && typeof obj.repo === 'string') return obj;
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(snap: ReportSnapshot): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://bobsprint.vercel.app';
  return `${origin}/share#${encodeSnapshot(snap)}`;
}

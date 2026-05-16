'use client';

import { Terminal, ExternalLink, Zap } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import Link from 'next/link';

const STEPS = [
  {
    n: 1,
    heading: 'Download Bob Shell',
    body: 'Go to the IBM Bob portal and download the Bob Shell installer (.tgz).',
    cta: { label: 'Open IBM Bob Portal →', href: 'https://bob.ibm.com' },
  },
  {
    n: 2,
    heading: 'Install it (one command)',
    body: 'Open a terminal in your Downloads folder and run:',
    cmd: 'npm install -g .\\bobshell-1.0.3.tgz',
    cmdNote: 'Mac / Linux: use a forward slash  →  ./bobshell-1.0.3.tgz',
  },
  {
    n: 3,
    heading: 'Sign in with your IBMid',
    body: 'Run bob — it opens a browser tab to log you in. Done.',
    cmd: 'bob',
  },
];

export function SetupRequired({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="max-w-xl mx-auto">
      {/* Title */}
      <div className="mb-8 text-center">
        <p className="text-xs font-mono tracking-widest uppercase text-warning mb-3">
          Bob Shell not detected
        </p>
        <h2 className="text-2xl font-black text-ink-100 mb-2">
          Get set up in 3 steps
        </h2>
        <p className="text-ink-400 text-sm">
          BobSprint runs IBM Bob under the hood. Install takes ~2 minutes.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-8">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="card rounded-2xl p-5 flex gap-4 items-start border border-border-subtle"
          >
            {/* Number badge */}
            <div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm font-black text-cyan">{s.n}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink-100 mb-1">{s.heading}</p>
              <p className="text-ink-400 text-sm mb-3">{s.body}</p>

              {s.cta && (
                <a
                  href={s.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan hover:text-cyan/80 transition-colors"
                >
                  {s.cta.label} <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {s.cmd && (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 bg-[var(--bg-base)] rounded-xl px-4 py-3 border border-border-subtle font-mono text-sm">
                    <Terminal className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                    <code className="flex-1 text-cyan text-xs">{s.cmd}</code>
                    <CopyButton value={s.cmd} />
                  </div>
                  {s.cmdNote && (
                    <p className="text-ink-600 text-xs pl-1">{s.cmdNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onRetry}
          className="btn btn-primary w-full sm:w-auto px-6 py-3 text-sm font-semibold"
        >
          I&apos;ve installed Bob — Retry
        </button>

        <Link
          href="/run?url=demo"
          className="btn w-full sm:w-auto px-6 py-3 text-sm font-semibold border border-border-subtle text-ink-300 hover:text-ink-100 hover:border-border-active transition-colors inline-flex items-center justify-center gap-2"
        >
          <Zap className="w-3.5 h-3.5" />
          Skip — Try demo mode instead
        </Link>
      </div>

      <p className="text-center text-ink-600 text-xs mt-4">
        Demo mode runs fully offline. No Bob needed.
      </p>
    </div>
  );
}

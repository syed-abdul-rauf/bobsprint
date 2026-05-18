'use client';

// Shows the actual files Bob wrote during the run — expandable, with the
// verbatim content, language, safety status, and a copy button. This is the
// concrete proof that Bob produced real, reviewable code (not a summary).

import { useState } from 'react';
import { ChevronRight, FileCode2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import type { AutoPilotRun, SafeWin } from '@/lib/types';

const TYPE_TONE: Record<string, 'cyan' | 'violet' | 'mint' | 'amber'> = {
  'add-tests': 'mint',
  'add-docs': 'cyan',
  'add-jsdoc': 'violet',
  'add-readme-section': 'amber',
};

function lang(path: string): string {
  const e = path.split('.').pop()?.toLowerCase() ?? '';
  return ({ py: 'python', ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx', md: 'md', mdx: 'mdx', go: 'go', rs: 'rust', java: 'java', rb: 'ruby', yml: 'yaml', yaml: 'yaml', json: 'json' } as Record<string, string>)[e] ?? 'text';
}

function FileRow({ win }: { win: SafeWin }) {
  const [open, setOpen] = useState(false);
  const lines = win.content ? win.content.split('\n').length : 0;
  const applied = !!win.appliedAt;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[var(--bg-card)] transition-colors text-left"
      >
        <ChevronRight className={`w-4 h-4 text-ink-500 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        <FileCode2 className="w-4 h-4 text-cyan shrink-0" />
        <span className="font-mono text-sm text-ink-100 truncate flex-1">{win.targetPath}</span>
        <Badge tone={TYPE_TONE[win.type] ?? 'neutral'}>{win.type.replace('add-', '')}</Badge>
        {win.safetyStatus === 'approved' ? (
          <Badge tone="mint"><ShieldCheck className="w-3 h-3" /> {applied ? 'Applied' : 'Approved'}</Badge>
        ) : win.safetyStatus === 'deferred' ? (
          <Badge tone="amber"><ShieldAlert className="w-3 h-3" /> Deferred</Badge>
        ) : (
          <Badge tone="neutral">Pending</Badge>
        )}
      </button>

      {open && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-card)] text-[11px] font-mono text-ink-500">
            <span>{lang(win.targetPath)} · {lines} lines{win.commitSha ? ` · ${win.commitSha.slice(0, 7)}` : ''}</span>
            {win.content && <CopyButton value={win.content} label="Copy file" variant="subtle" />}
          </div>
          {win.safetyReason && (
            <p className="px-4 py-2 text-xs text-warning bg-warning/[0.05] border-b border-[var(--border-subtle)]">
              {win.safetyReason}
            </p>
          )}
          <pre className="text-xs font-mono text-ink-300 leading-relaxed p-4 overflow-auto max-h-[420px] whitespace-pre">
            {win.content || '(no content — Bob deferred this file before writing it)'}
          </pre>
        </div>
      )}
    </div>
  );
}

export function BobFiles({ run }: { run: AutoPilotRun }) {
  if (!run.safeWins || run.safeWins.length === 0) return null;
  return (
    <div className="card p-5">
      <h2 className="section-label mb-1">Files Bob wrote ({run.safeWins.length})</h2>
      <p className="text-ink-500 text-xs mb-4">The exact, reviewable output of each Bob Code call — expand to inspect.</p>
      <div className="space-y-2">
        {run.safeWins.map((w) => <FileRow key={w.id} win={w} />)}
      </div>
    </div>
  );
}

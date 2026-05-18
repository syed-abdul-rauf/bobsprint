'use client';

import Link from 'next/link';
import { ArrowRight, Package, FileDown, Copy, Check, GitPullRequest, ExternalLink, CheckSquare, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { ScoreRing } from '@/components/ui/score-ring';
import { Badge } from '@/components/ui/badge';
import { ShareButton } from '@/components/report/share-button';
import { useApp, useActiveRun } from '@/lib/store';
import { computeHealth } from '@/lib/health';
import { buildSnapshot, snapshotToMarkdown, repoLabel } from '@/lib/sprint-pack';

function bullets(text: string): string[] {
  return text.split('\n').map((l) => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
}

function PackView() {
  const runs = useApp((s) => s.runs);
  const run = useActiveRun();
  const [copied, setCopied] = useState(false);

  if (!run) {
    return (
      <div className="container-app py-24 text-center">
        <Package className="w-8 h-8 text-ink-600 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-ink-100 mb-3">No Sprint Pack yet</h1>
        <p className="text-ink-500 text-sm mb-8">
          {runs.length === 0 ? 'Run Bob on a repo to generate a sprint pack.' : 'No active run selected.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/run" className="btn btn-primary px-5 py-2.5 text-sm font-semibold">
            Start a run <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {runs.length > 0 && (
            <Link href="/runs" className="text-sm font-mono text-ink-500 hover:text-ink-200">Run history</Link>
          )}
        </div>
      </div>
    );
  }

  const h = computeHealth(run);
  const md = snapshotToMarkdown(buildSnapshot(run));
  const approved = run.safeWins.filter((w) => w.safetyStatus === 'approved');
  const deferred = run.safeWins.filter((w) => w.safetyStatus === 'deferred');
  const summary = bullets(run.executiveSummary ?? '');

  function download() {
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `sprint-pack-${repoLabel(run!.githubUrl).replace('/', '-')}.md`,
    });
    a.click();
  }
  async function copy() {
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="container-app py-8 max-w-3xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan" /> Sprint Pack
          </h1>
          <p className="text-ink-500 text-sm font-mono mt-1">{repoLabel(run.githubUrl)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={download} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-active)] border border-[var(--border-subtle)] text-ink-200 transition-colors">
            <FileDown className="w-3.5 h-3.5" /> Download .md
          </button>
          <button onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-active)] border border-[var(--border-subtle)] text-ink-200 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy MD'}
          </button>
          <ShareButton run={run} />
        </div>
      </div>

      {/* Health hero */}
      <div className="card p-6 mb-6 flex items-center gap-6">
        <ScoreRing value={h.score} size={104} thickness={9} label="Health" tone={h.tone} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl font-black text-ink-100">Grade {h.grade}</span>
            <Badge tone={h.tone} uppercase>{h.headline}</Badge>
          </div>
          <p className="text-ink-500 text-xs font-mono mb-2">
            {run.filesAnalyzed ?? 0} files analyzed · ₿{(run.totalCost ?? 0).toFixed(2)} spent
          </p>
          <ul className="space-y-1">
            {h.reasons.slice(0, 4).map((r, i) => (
              <li key={i} className="text-sm text-ink-300 flex gap-2"><span className="text-cyan mt-0.5">•</span><span>{r}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="section-label mb-3">Executive summary</h2>
          <ul className="space-y-2">
            {summary.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-300 leading-relaxed"><span className="text-cyan mt-0.5 shrink-0">•</span><span>{b}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5 mb-6">
        <h2 className="section-label mb-3 text-success/80 flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5" /> Prioritized actions ({approved.length})
        </h2>
        {approved.length ? (
          <ul className="space-y-2">
            {approved.map((w) => (
              <li key={w.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 w-4 h-4 rounded border border-success/40 shrink-0" />
                <span className="text-ink-200">
                  <span className="font-mono text-ink-100">{w.targetPath}</span>
                  <span className="text-ink-500"> — add {w.type.replace('add-', '')} · Bob-written, safety-approved</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-500 text-sm">No auto-approved changes for this run.</p>
        )}
      </div>

      {deferred.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="section-label mb-3 text-warning/80 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Deferred for human review ({deferred.length})
          </h2>
          <ul className="space-y-2">
            {deferred.map((w) => (
              <li key={w.id} className="text-sm text-ink-300">
                <span className="font-mono text-ink-100">{w.targetPath}</span>
                <span className="text-ink-500"> — {w.safetyReason ?? 'flagged by the safety gate'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {run.prUrl ? (
        <a href={run.prUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center py-4 text-base font-bold rounded-2xl">
          <GitPullRequest className="w-5 h-5" /> Open the draft pull request <ExternalLink className="w-4 h-4 opacity-70" />
        </a>
      ) : run.applyWarning ? (
        <div className="card p-4 text-warning text-sm leading-relaxed">{run.applyWarning}</div>
      ) : null}
    </div>
  );
}

export default function PackPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <HydrationGate>
        <PackView />
      </HydrationGate>
    </div>
  );
}

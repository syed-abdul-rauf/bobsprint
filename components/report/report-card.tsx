'use client';

import { motion } from 'framer-motion';
import {
  Clock, FileSearch, CheckCircle2, PauseCircle, Coins, TrendingUp,
  GitPullRequest, FileCode2, ExternalLink, ArrowRight, FileDown,
} from 'lucide-react';
import Link from 'next/link';
import type { AutoPilotRun } from '@/lib/types';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function hoursSaved(filesAnalyzed: number, approvedWins: number): number {
  return Math.min(8, Math.round(((filesAnalyzed * 4 + approvedWins * 60) / 60) * 10) / 10);
}

const TYPE_LABEL: Record<string, string> = {
  'add-tests': 'Tests',
  'add-docs': 'Docs',
  'add-jsdoc': 'JSDoc',
  'add-readme-section': 'README',
};

export function ReportCard({ run }: { run: AutoPilotRun }) {
  const approved = run.safeWins.filter((w) => w.safetyStatus === 'approved');
  const deferred = run.safeWins.filter((w) => w.safetyStatus === 'deferred');
  const elapsed = (run.completedAt ?? run.abortedAt ?? Date.now()) - run.startedAt;
  const saved = hoursSaved(run.filesAnalyzed ?? 0, approved.length);

  // Fake sparkline using elapsed-proportional evidence counts (visual only)
  const sparkData = run.evidence.length > 0
    ? run.evidence.map((_, i) => i + 1)
    : [0, 1, 2, 3, 4, 5];

  const summaryBullets = (run.executiveSummary ?? '')
    .split('\n')
    .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);

  const tiles = [
    { icon: Clock,        label: 'Elapsed',         value: fmtDuration(elapsed),             color: 'text-cyan',    border: 'border-t-cyan/40'    },
    { icon: FileSearch,   label: 'Files analyzed',   value: String(run.filesAnalyzed ?? 0),   color: 'text-violet',  border: 'border-t-violet/40'  },
    { icon: CheckCircle2, label: 'Changes applied',  value: String(approved.length),          color: 'text-success', border: 'border-t-success/30' },
    { icon: PauseCircle,  label: 'Deferred',         value: String(deferred.length),          color: 'text-warning', border: 'border-t-warning/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero — hours saved + sparkline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 110%, rgb(var(--accent-cyan)/0.12), transparent 70%), var(--bg-card)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-active)',
        }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            {run.isDemo && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest bg-[var(--bg-card-active)] border border-[var(--border-active)] text-cyan mb-3">
                Demo
              </span>
            )}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-display text-5xl font-black text-ink-100">~{saved}</span>
              <span className="text-xl font-semibold text-ink-400">hours saved</span>
            </div>
            <p className="text-ink-500 text-sm font-mono">
              {run.isDemo ? 'northpeak-demo/proposal-studio' : run.githubUrl}
            </p>
          </div>
          <div className="shrink-0 text-cyan/60">
            <Sparkline values={sparkData} width={90} height={32} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs font-mono text-ink-500">
          <span><span className="text-cyan font-bold">₿{(run.totalCost ?? 0).toFixed(2)}</span> bobcoins</span>
          <span>·</span>
          <span>{fmtDuration(elapsed)} elapsed</span>
          <span>·</span>
          <span><span className="text-success font-bold">{approved.length}</span> changes applied</span>
        </div>
      </motion.div>

      {/* 4-tile grid */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className={cn('card p-4 border-t-2', t.border)}
          >
            <t.icon className={cn('w-4 h-4 mb-2', t.color)} />
            <div className="text-2xl font-black tracking-tight text-ink-100 mb-0.5">{t.value}</div>
            <div className="text-ink-500 text-xs font-mono">{t.label}</div>
          </motion.div>
        ))}
      </div>

      {/* CTA — PR link */}
      {run.prUrl ? (
        <motion.a
          href={run.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="btn btn-primary w-full justify-center py-4 text-base font-bold focus-ring rounded-2xl"
        >
          <GitPullRequest className="w-5 h-5" />
          Open draft pull request
          <ExternalLink className="w-4 h-4 opacity-70" />
        </motion.a>
      ) : (
        <div className="card p-4 text-center text-ink-500 text-sm font-mono">
          {run.stage === 'done' ? 'No PR opened (demo mode or no approved changes)' : 'PR not yet opened'}
        </div>
      )}

      {/* Secondary row */}
      <div className="flex items-center justify-center gap-6 text-xs font-mono text-ink-600 flex-wrap">
        <Link href="/evidence" className="flex items-center gap-1.5 hover:text-ink-300 transition-colors focus-ring rounded">
          <FileSearch className="w-3.5 h-3.5" /> View evidence
        </Link>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
            const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bobsprint-report.json' });
            a.click();
          }}
          className="flex items-center gap-1.5 hover:text-ink-300 transition-colors focus-ring rounded"
        >
          <FileDown className="w-3.5 h-3.5" /> Download JSON
        </button>
        <Link href="/run" className="flex items-center gap-1.5 hover:text-ink-300 transition-colors focus-ring rounded">
          <ArrowRight className="w-3.5 h-3.5" /> Rescue another
        </Link>
      </div>

      {/* Executive summary */}
      {summaryBullets.length > 0 && (
        <div className="card p-5">
          <h2 className="section-label mb-3">Executive summary</h2>
          <ul className="space-y-2">
            {summaryBullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-300 leading-relaxed">
                <span className="text-cyan mt-0.5 shrink-0">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Applied changes */}
      {approved.length > 0 && (
        <div className="card p-5">
          <h2 className="section-label mb-3 text-success/80">Applied ({approved.length})</h2>
          <div className="space-y-0">
            {approved.map((w) => (
              <div key={w.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                <FileCode2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs text-ink-200 font-mono">{w.targetPath}</code>
                    <span className="chip">{TYPE_LABEL[w.type] ?? w.type}</span>
                    {w.commitSha && (
                      <span className="text-[10px] font-mono text-ink-600">{w.commitSha.slice(0, 7)}</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{w.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deferred changes */}
      {deferred.length > 0 && (
        <div className="card p-5">
          <h2 className="section-label mb-3 text-warning/80">Deferred to human review ({deferred.length})</h2>
          <div className="space-y-0">
            {deferred.map((w) => (
              <div key={w.id} className="flex items-start gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                <PauseCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <code className="text-xs text-ink-200 font-mono">{w.targetPath}</code>
                  <p className="text-xs text-warning/70 mt-0.5">{w.safetyReason ?? 'Requires human context.'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

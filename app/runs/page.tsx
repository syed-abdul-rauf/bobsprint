'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  History, ArrowRight, Trash2, GitBranch, Clock, Coins,
  FileSearch, CheckCircle2, XCircle, PauseCircle, Loader2, AlertTriangle,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { computeHealth } from '@/lib/health';
import type { AutoPilotRun } from '@/lib/types';

const TERMINAL = new Set(['done', 'error', 'aborted']);

type RunState = 'running' | 'interrupted' | 'done' | 'error' | 'aborted' | 'queued';

function runState(r: AutoPilotRun): RunState {
  if (r.stage === 'done') return 'done';
  if (r.stage === 'error') return 'error';
  if (r.stage === 'aborted') return 'aborted';
  if (r.stage === 'idle') return 'queued';
  const beat = r.lastHeartbeat ?? r.startedAt;
  return Date.now() - beat > 30_000 ? 'interrupted' : 'running';
}

const STATE_META: Record<RunState, { label: string; tone: 'mint' | 'coral' | 'amber' | 'cyan' | 'neutral'; Icon: typeof Clock }> = {
  done:        { label: 'Completed',   tone: 'mint',    Icon: CheckCircle2 },
  error:       { label: 'Failed',      tone: 'coral',   Icon: XCircle },
  aborted:     { label: 'Stopped',     tone: 'amber',   Icon: PauseCircle },
  running:     { label: 'Running',     tone: 'cyan',    Icon: Loader2 },
  interrupted: { label: 'Resuming…',   tone: 'amber',   Icon: AlertTriangle },
  queued:      { label: 'Queued',      tone: 'neutral', Icon: Clock },
};

function repoLabel(url: string): string {
  const m = url.match(/github\.com\/([^/]+\/[^/?#]+)/i);
  return m ? m[1].replace(/\.git$/, '') : url;
}

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function duration(r: AutoPilotRun): string {
  const end = r.completedAt ?? r.abortedAt ?? (TERMINAL.has(r.stage) ? r.startedAt : Date.now());
  const s = Math.max(0, Math.round((end - r.startedAt) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function RunsView() {
  const runs = useApp((s) => s.runs);
  const setActiveRun = useApp((s) => s.setActiveRun);
  const deleteRun = useApp((s) => s.deleteRun);
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function open(id: string) {
    setActiveRun(id);
    router.push('/report');
  }

  const totalSpent = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);

  if (runs.length === 0) {
    return (
      <div className="container-app py-24 text-center">
        <History className="w-8 h-8 text-ink-600 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-ink-100 mb-3">No runs yet</h1>
        <p className="text-ink-500 text-sm mb-8">Every Bob run is saved here automatically — even if you close the tab mid-run.</p>
        <Link href="/run" className="btn btn-primary px-5 py-2.5 text-sm font-semibold">
          Start a run <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-8 max-w-3xl">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan" /> Run history
          </h1>
          <p className="text-ink-500 text-sm mt-1">{runs.length} run{runs.length === 1 ? '' : 's'} · ₿{totalSpent.toFixed(2)} spent</p>
        </div>
        <Link href="/run" className="btn btn-primary px-4 py-2 text-sm font-semibold shrink-0">
          New run <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {runs.map((r) => {
          const st = runState(r);
          const meta = STATE_META[st];
          const health = r.stage === 'done' ? computeHealth(r) : null;
          return (
            <div
              key={r.id}
              onClick={() => open(r.id)}
              className="card p-4 cursor-pointer hover:border-[var(--border-active)] transition-colors group"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <GitBranch className="w-4 h-4 text-ink-500 shrink-0" />
                  <span className="font-mono text-sm text-ink-100 truncate">{repoLabel(r.githubUrl)}</span>
                  {r.isDemo && <Badge tone="cyan" uppercase>Demo</Badge>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {health && (
                    <Badge tone={health.tone} title={health.headline}>
                      Grade {health.grade} · {health.score}
                    </Badge>
                  )}
                  <Badge tone={meta.tone}>
                    <meta.Icon className={`w-3 h-3 ${st === 'running' ? 'animate-spin' : ''}`} />
                    {meta.label}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs font-mono text-ink-500 flex-wrap">
                <span className="flex items-center gap-1"><FileSearch className="w-3 h-3" />{r.filesAnalyzed ?? 0} files</span>
                <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-cyan" />₿{(r.totalCost ?? 0).toFixed(2)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{duration(r)}</span>
                <span>{r.safeWins.filter((w) => w.safetyStatus === 'approved').length} applied</span>
                {r.prUrl && <span className="text-success">PR opened</span>}
                <span className="ml-auto">{ago(r.startedAt)}</span>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)] text-xs font-mono">
                <button
                  onClick={(e) => { e.stopPropagation(); open(r.id); }}
                  className="text-cyan hover:underline flex items-center gap-1"
                >
                  Report <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveRun(r.id); router.push('/evidence'); }}
                  className="text-ink-400 hover:text-ink-100"
                >
                  Evidence
                </button>
                {st === 'running' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveRun(r.id); router.push('/run'); }}
                    className="text-ink-400 hover:text-ink-100"
                  >
                    Live pipeline
                  </button>
                )}
                {confirmId === r.id ? (
                  <span className="ml-auto flex items-center gap-2 text-danger">
                    Delete?
                    <button onClick={(e) => { e.stopPropagation(); deleteRun(r.id); setConfirmId(null); }} className="underline">yes</button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmId(null); }} className="text-ink-500 underline">no</button>
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmId(r.id); }}
                    className="ml-auto text-ink-600 hover:text-danger flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete run"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RunsPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <HydrationGate>
        <RunsView />
      </HydrationGate>
    </div>
  );
}

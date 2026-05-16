'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitBranch, Zap, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { PipelineStages } from '@/components/run/pipeline-stages';
import { LiveLog } from '@/components/run/live-log';
import { BudgetMeter } from '@/components/run/budget-meter';
import { KillSwitch } from '@/components/run/kill-switch';
import { SetupRequired } from '@/components/run/setup-required';
import { DemoBadge } from '@/components/run/demo-badge';
import { useApp, useActiveRun } from '@/lib/store';
import { AutoPilotController } from '@/lib/autopilot';
import { isBobBridgeAvailable } from '@/lib/bob-shell';
import { DEMO_FIXTURE_URL } from '@/lib/demo-data';
import { generateId } from '@/lib/utils';
import type { AutoPilotRun } from '@/lib/types';

type Phase = 'input' | 'checking' | 'bridge-offline' | 'running' | 'finished';

function isDemoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u === 'demo' || u === DEMO_FIXTURE_URL;
}

// ── URL entry form (shown when /run has no ?url=) ─────────────────────────────

function UrlForm() {
  const [value, setValue] = useState('');
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto pt-24 px-6 text-center">
      <h1 className="text-3xl font-black tracking-tight text-ink-100 mb-3">Run Bob on a repo</h1>
      <p className="text-ink-400 text-sm mb-8">
        Paste a public GitHub URL to get started.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (v) router.push(`/run?url=${encodeURIComponent(v)}`);
        }}
        className="flex items-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
      >
        <GitBranch className="ml-4 w-4 h-4 text-ink-500 shrink-0" />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='github.com/owner/repo'
          className="flex-1 bg-transparent px-3 py-4 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none font-mono"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="btn btn-primary m-1.5 px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          <Zap className="w-3.5 h-3.5" /> Run Bob
        </button>
      </form>
    </div>
  );
}

// ── Main pipeline view ───────────────────────────────────────────────────────

function RunView() {
  const params = useSearchParams();
  const router = useRouter();
  const url = params.get('url') ?? '';

  const githubPat = useApp((s) => s.githubPat);
  const bobcoinBudget = useApp((s) => s.bobcoinBudget);
  const addRun = useApp((s) => s.addRun);
  const updateRun = useApp((s) => s.updateRun);
  const activeRun = useActiveRun();

  const [phase, setPhase] = useState<Phase>(url ? 'checking' : 'input');
  const controllerRef = useRef<AutoPilotController | null>(null);
  const startedRef = useRef(false);

  const demo = isDemoUrl(url);

  // BOBSPRINT_DEV_MODE=1 in .env.local → cap run to 1 file, skip safety-gate Bob call.
  // Use during development to preserve the hackathon Bobcoin budget.
  const devMode = process.env.NEXT_PUBLIC_BOBSPRINT_DEV_MODE === '1';

  const begin = useCallback(async () => {
    if (startedRef.current || !url) return;

    if (!demo) {
      const available = await isBobBridgeAvailable();
      if (!available) {
        setPhase('bridge-offline');
        return;
      }
    }

    startedRef.current = true;
    setPhase('running');

    const run: AutoPilotRun = {
      id: generateId(),
      githubUrl: demo ? DEMO_FIXTURE_URL : url,
      startedAt: Date.now(),
      stage: 'idle',
      safeWins: [],
      evidence: [],
      totalCost: 0,
      isDemo: demo,
    };
    addRun(run);

    const ctrl = new AutoPilotController({
      run,
      pat: githubPat,
      devMode,
      onUpdate: (patch) => updateRun(run.id, patch),
    });
    controllerRef.current = ctrl;
    ctrl.start();
  }, [url, demo, githubPat, devMode, addRun, updateRun]);

  // When the user submits the inline form, the client navigates to
  // /run?url=… and `url` becomes truthy — but `phase` was initialised once
  // and is still 'input'. Promote it so the begin() trigger below fires.
  useEffect(() => {
    if (url && phase === 'input') setPhase('checking');
  }, [url, phase]);

  useEffect(() => {
    if (url && phase === 'checking') begin();
  }, [url, phase, begin]);

  // NOTE: intentionally no abort-on-unmount cleanup. React StrictMode (dev)
  // mounts → unmounts → remounts; an unconditional cleanup abort would kill
  // the only controller while startedRef blocks the restart. The run lives in
  // the persisted store, has a 5-min hard timeout, and the KillSwitch gives
  // the user explicit control, so a background-completing run is safe.

  // Redirect to /report once the run finishes — only for runs we started here.
  useEffect(() => {
    if (!activeRun || !startedRef.current) return;
    if (activeRun.stage === 'done') {
      setPhase('finished');
      const t = setTimeout(() => router.push('/report'), 1_400);
      return () => clearTimeout(t);
    }
  }, [activeRun?.stage, router, activeRun]);

  if (!url) return <UrlForm />;

  if (phase === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-cyan/40 border-t-cyan animate-spin" />
        <p className="text-ink-500 text-sm font-mono">Checking Bob Bridge…</p>
      </div>
    );
  }

  if (phase === 'bridge-offline') {
    return (
      <div className="max-w-2xl mx-auto pt-16 px-6">
        <SetupRequired
          onRetry={() => {
            startedRef.current = false;
            setPhase('checking');
          }}
        />
      </div>
    );
  }

  const run = activeRun;
  const stage = run?.stage ?? 'idle';
  const errored = stage === 'error';
  const aborted = stage === 'aborted';

  return (
    <div className="container-app py-8">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-ink-100">Pipeline</h1>
            {demo && <DemoBadge />}
          </div>
          <p className="text-ink-500 text-xs font-mono truncate">
            {demo ? 'northpeak-demo/proposal-studio (pre-recorded fixture)' : url}
          </p>
        </div>
        <KillSwitch
          onAbort={() => controllerRef.current?.abort()}
          disabled={stage === 'done' || errored || aborted}
        />
      </div>

      {/* PAT missing banner — Apply stage will be skipped */}
      {!demo && !githubPat && phase !== 'finished' && (
        <div className="mb-4 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 bg-warning/[0.05] border border-warning/20">
          <p className="text-warning text-xs font-mono">
            No GitHub PAT — Apply stage will be skipped (no fork or PR).
          </p>
          <Link href="/settings" className="text-xs font-mono text-warning hover:underline shrink-0 focus-ring rounded">
            Add in Settings →
          </Link>
        </div>
      )}

      {/* Error / aborted banners */}
      {errored && (
        <div
          className="mb-6 rounded-xl p-4 flex items-start gap-3 bg-danger/[0.06] border border-danger/25">
          <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-danger font-semibold text-sm">Run failed</p>
            <p className="text-ink-400 text-xs mt-1 font-mono">{run?.error ?? 'Unknown error'}</p>
          </div>
        </div>
      )}
      {aborted && (
        <div className="mb-6 rounded-xl p-4 bg-warning/[0.05] border border-warning/25">
          <p className="text-warning font-semibold text-sm">Run stopped by user</p>
        </div>
      )}
      {phase === 'finished' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 rounded-xl p-4 flex items-center justify-between gap-3 bg-success/[0.06] border border-success/25"
        >
          <p className="text-success font-semibold text-sm">
            Done — redirecting to the report…
          </p>
          <button
            onClick={() => router.push('/report')}
            className="flex items-center gap-1.5 text-xs font-mono text-success hover:underline focus-ring rounded"
          >
            View report now <ExternalLink className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div>
          <PipelineStages
            currentStage={stage}
            run={run}
            safeWinCount={run?.safeWins?.filter((w) => w.safetyStatus === 'approved').length}
            deferredCount={run?.safeWins?.filter((w) => w.safetyStatus === 'deferred').length}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="card overflow-hidden flex flex-col" style={{ height: 460 }}>
            <LiveLog entries={run?.evidence ?? []} />
          </div>
          <div className="card p-4">
            <BudgetMeter spent={run?.totalCost ?? 0} budget={bobcoinBudget} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RunPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <HydrationGate>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-32">
              <div className="h-6 w-6 rounded-full border-2 border-cyan/40 border-t-cyan animate-spin" />
            </div>
          }
        >
          <RunView />
        </Suspense>
      </HydrationGate>
    </div>
  );
}

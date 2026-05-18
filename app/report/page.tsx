'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { ReportCard } from '@/components/report/report-card';
import { BobFiles } from '@/components/report/bob-files';
import { AskBob } from '@/components/report/ask-bob';
import { ScoreRing } from '@/components/ui/score-ring';
import { Badge } from '@/components/ui/badge';
import { useApp, useActiveRun } from '@/lib/store';
import { computeHealth } from '@/lib/health';
import type { AutoPilotRun } from '@/lib/types';

function HealthCard({ run }: { run: AutoPilotRun }) {
  const h = computeHealth(run);
  return (
    <div className="card p-6 mb-6 flex items-center gap-6">
      <ScoreRing value={h.score} size={108} thickness={9} label="Health" tone={h.tone} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl font-black text-ink-100">Grade {h.grade}</span>
          <Badge tone={h.tone} uppercase>{h.headline}</Badge>
        </div>
        <p className="text-ink-500 text-xs mb-2 font-mono">Repo health score, derived from Bob&apos;s analysis</p>
        <ul className="space-y-1">
          {h.reasons.slice(0, 4).map((r, i) => (
            <li key={i} className="text-sm text-ink-300 flex gap-2">
              <span className="text-cyan mt-0.5 shrink-0">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReportView() {
  const runs = useApp((s) => s.runs);
  const activeRun = useActiveRun();

  if (!activeRun) {
    return (
      <div className="container-app py-24 text-center">
        <h1 className="text-2xl font-black text-ink-100 mb-3">No report yet</h1>
        <p className="text-ink-500 text-sm mb-8">
          {runs.length === 0
            ? 'Run Bob on a repo to generate a rescue report.'
            : 'No active run selected.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/run" className="btn btn-primary px-5 py-2.5 text-sm font-semibold">
            Start a run <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {runs.length > 0 && (
            <Link href="/runs" className="text-sm font-mono text-ink-500 hover:text-ink-200">
              View run history
            </Link>
          )}
        </div>
      </div>
    );
  }

  const incomplete = activeRun.stage !== 'done';

  return (
    <div className="container-app py-8 max-w-3xl">
      {incomplete && (
        <div className="mb-6 card-active rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-cyan text-sm">
            This run is still <span className="font-mono">{activeRun.stage}</span>. Showing partial results.
          </p>
          <Link href="/run" className="text-xs font-mono text-cyan hover:underline shrink-0 focus-ring rounded">
            Back to pipeline
          </Link>
        </div>
      )}

      {activeRun.stage === 'done' && <HealthCard run={activeRun} />}

      <ReportCard run={activeRun} />

      <div className="mt-6 space-y-6">
        <BobFiles run={activeRun} />
        {activeRun.stage === 'done' && <AskBob run={activeRun} />}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <HydrationGate>
        <ReportView />
      </HydrationGate>
    </div>
  );
}

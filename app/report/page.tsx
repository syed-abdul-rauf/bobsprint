'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { ReportCard } from '@/components/report/report-card';
import { useApp, useActiveRun } from '@/lib/store';

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
        <Link href="/run" className="btn btn-primary px-5 py-2.5 text-sm font-semibold">
          Start a run <ArrowRight className="w-3.5 h-3.5" />
        </Link>
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

      <ReportCard run={activeRun} />
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

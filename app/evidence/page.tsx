'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { ArrowRight, Download, FileText } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { HydrationGate } from '@/components/shell/hydration-gate';
import { Timeline } from '@/components/evidence/timeline';
import { CopyButton } from '@/components/ui/copy-button';
import { useApp, useActiveRun } from '@/lib/store';
import type { EvidenceEntry } from '@/lib/types';

// ── Serialisers ───────────────────────────────────────────────────────────────

function toMarkdown(entries: EvidenceEntry[]): string {
  const lines = ['# Evidence trail\n'];
  for (const e of entries) {
    const ts = new Date(e.timestamp).toISOString();
    lines.push(`## ${e.stage} · ${e.eventType}`);
    lines.push(`*${ts}*${e.durationMs ? `  · ${e.durationMs}ms` : ''}${e.costEstimate ? `  · ₿${e.costEstimate.toFixed(2)}` : ''}`);
    lines.push(`\n${e.summary}\n`);
    if (e.promptSummary)   lines.push(`**Prompt (first 300 chars)**\n\`\`\`\n${e.promptSummary}\n\`\`\`\n`);
    if (e.responseSummary) lines.push(`**Response (first 300 chars)**\n\`\`\`\n${e.responseSummary}\n\`\`\`\n`);
  }
  return lines.join('\n');
}

function downloadJson(entries: EvidenceEntry[], filename: string) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── View ──────────────────────────────────────────────────────────────────────

function EvidenceView() {
  const runs = useApp((s) => s.runs);
  const activeRun = useActiveRun();

  const handleDownload = useCallback(() => {
    if (!activeRun) return;
    const name = activeRun.isDemo ? 'demo-evidence.json' : `evidence-${activeRun.id}.json`;
    downloadJson(activeRun.evidence, name);
  }, [activeRun]);

  if (!activeRun) {
    return (
      <div className="container-app py-24 text-center">
        <h1 className="text-2xl font-black text-ink-100 mb-3">No run selected</h1>
        <p className="text-ink-500 text-sm mb-8">
          {runs.length === 0
            ? 'Run Bob on a repo to generate an audit trail.'
            : 'Pick a run from the report, or start a new one.'}
        </p>
        <Link href="/run" className="btn btn-primary px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5">
          Start a run <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const cost = activeRun.totalCost ?? 0;
  const md   = toMarkdown(activeRun.evidence);

  return (
    <div className="container-app py-8 max-w-4xl">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-ink-100 mb-1">Evidence trail</h1>
          <p className="text-ink-500 text-xs font-mono truncate">
            {activeRun.isDemo ? 'northpeak-demo/proposal-studio (demo)' : activeRun.githubUrl}
            {' · '}{activeRun.evidence.length} events
            {' · '}₿{cost.toFixed(2)} spent
          </p>
        </div>

        {/* Export toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton
            value={md}
            label="Copy MD"
            variant="default"
          />
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-active)] border border-[var(--border-subtle)] text-ink-200 transition-colors focus-ring"
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON
          </button>
          {activeRun.stage === 'done' && (
            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg btn btn-primary font-medium"
            >
              <FileText className="h-3.5 w-3.5" />
              View report
            </Link>
          )}
        </div>
      </div>

      <Timeline entries={activeRun.evidence} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EvidencePage() {
  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <HydrationGate>
        <EvidenceView />
      </HydrationGate>
    </div>
  );
}

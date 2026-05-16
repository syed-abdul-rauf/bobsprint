'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, PauseCircle } from 'lucide-react';
import type { EvidenceEntry } from '@/lib/types';
import { cn, formatRelativeTime } from '@/lib/utils';

const STAGE_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  recon:          { bg: 'bg-cyan/10',    text: 'text-cyan',    dot: 'bg-cyan'    },
  'fan-out':      { bg: 'bg-violet/10',  text: 'text-violet',  dot: 'bg-violet'  },
  'safety-gate':  { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  apply:          { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  done:           { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  error:          { bg: 'bg-danger/10',  text: 'text-danger',  dot: 'bg-danger'  },
  aborted:        { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
};

const FALLBACK = { bg: 'bg-[var(--border-subtle)]', text: 'text-ink-400', dot: 'bg-ink-500' };

const EVENT_LABEL: Record<string, string> = {
  'recon-complete': 'Recon complete',
  'bob-plan':       'Bob · Plan mode',
  'bob-ask':        'Bob · Ask mode',
  'bob-code':       'Bob · Code mode',
  'safety-gate':    'Safety gate',
  'file-applied':   'File committed',
  'pr-opened':      'PR opened',
  error:            'Error',
  aborted:          'Aborted',
};

function Row({ entry }: { entry: EvidenceEntry }) {
  const [open, setOpen] = useState(false);
  const cls = STAGE_CLASSES[entry.stage] ?? FALLBACK;
  const hasDetail = !!(entry.promptSummary || entry.responseSummary);

  return (
    <div className="relative pl-8">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[var(--border-subtle)]" />
      <div className={cn('absolute left-[7px] top-3.5 w-2 h-2 rounded-full ring-[3px]', cls.dot)}
        style={{ '--tw-ring-color': 'rgb(var(--bg-base))' } as React.CSSProperties} />

      <div
        className={cn(
          'mb-3 rounded-xl overflow-hidden card transition-colors duration-150',
          hasDetail && 'cursor-pointer hover:bg-[var(--bg-card-active)]',
        )}
        onClick={() => hasDetail && setOpen((v) => !v)}
      >
        <div className="p-3.5">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase', cls.bg, cls.text)}>
              {entry.stage}
            </span>
            <span className="text-xs font-semibold text-ink-200">
              {EVENT_LABEL[entry.eventType] ?? entry.eventType}
            </span>
            {entry.mode && (
              <span className="text-[10px] font-mono text-ink-500 border border-[var(--border-subtle)] px-1 rounded">
                {entry.mode}
              </span>
            )}
            <div className="flex-1" />
            {entry.durationMs != null && (
              <span className="text-[10px] font-mono text-ink-600">{entry.durationMs}ms</span>
            )}
            {entry.costEstimate != null && entry.costEstimate > 0 && (
              <span className="text-[10px] font-mono text-cyan/70">₿{entry.costEstimate.toFixed(2)}</span>
            )}
            <span className="text-[10px] font-mono text-ink-700">
              {formatRelativeTime(entry.timestamp)}
            </span>
            {hasDetail && (
              <ChevronRight className={cn('w-3.5 h-3.5 text-ink-600 transition-transform', open && 'rotate-90')} />
            )}
          </div>

          <p className="text-xs text-ink-300 leading-relaxed">{entry.summary}</p>

          {entry.deferred && entry.deferReason && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <PauseCircle className="w-3 h-3 text-warning mt-0.5 shrink-0" />
              <p className="text-[11px] text-warning/80 font-mono">{entry.deferReason}</p>
            </div>
          )}
        </div>

        {open && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-t border-[var(--border-subtle)] px-3.5 py-3 space-y-3 bg-[var(--bg-elevated)]"
          >
            {entry.promptSummary && (
              <div>
                <p className="section-label mb-1">Prompt sent (first 300 chars)</p>
                <pre className="text-[11px] text-ink-400 font-mono whitespace-pre-wrap break-words">
                  {entry.promptSummary}
                </pre>
              </div>
            )}
            {entry.responseSummary && (
              <div>
                <p className="section-label mb-1">Response (first 300 chars)</p>
                <pre className="text-[11px] text-ink-400 font-mono whitespace-pre-wrap break-words">
                  {entry.responseSummary}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function GhostRow() {
  return (
    <div className="relative pl-8 animate-ghost-pulse">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[var(--border-subtle)]" />
      <div className="absolute left-[7px] top-3.5 w-2 h-2 rounded-full bg-[var(--border-subtle)]" />
      <div className="mb-3 card p-3.5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="w-14 h-4 rounded bg-[var(--border-subtle)]" />
          <div className="w-24 h-4 rounded bg-[var(--border-subtle)]" />
          <div className="flex-1" />
          <div className="w-10 h-3 rounded bg-[var(--border-subtle)]" />
        </div>
        <div className="w-3/4 h-3 rounded bg-[var(--border-subtle)]" />
      </div>
    </div>
  );
}

export function Timeline({ entries }: { entries: EvidenceEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="pt-2">
        <GhostRow />
        <GhostRow />
        <GhostRow />
      </div>
    );
  }

  return (
    <div className="pt-2">
      {entries.map((e) => <Row key={e.id} entry={e} />)}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bot, ShieldCheck, GitCommit, CheckCircle2,
  AlertCircle, Ban, MessageSquare, Code2,
} from 'lucide-react';
import type { EvidenceEntry } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Icons ────────────────────────────────────────────────────────────────────

const EVENT_ICON: Record<string, React.ElementType> = {
  'recon-complete': Search,
  'bob-plan':       Bot,
  'bob-ask':        MessageSquare,
  'bob-code':       Code2,
  'safety-gate':    ShieldCheck,
  'file-applied':   GitCommit,
  'pr-opened':      CheckCircle2,
  'error':          AlertCircle,
  'aborted':        Ban,
};

// ── Stage badge colors (CSS var tokens) ─────────────────────────────────────

const STAGE_STYLE: Record<string, { bg: string; text: string }> = {
  recon:          { bg: 'bg-cyan/10',    text: 'text-cyan'    },
  'fan-out':      { bg: 'bg-violet/10',  text: 'text-violet'  },
  'safety-gate':  { bg: 'bg-warning/10', text: 'text-warning' },
  apply:          { bg: 'bg-success/10', text: 'text-success' },
  done:           { bg: 'bg-success/10', text: 'text-success' },
  error:          { bg: 'bg-danger/10',  text: 'text-danger'  },
  aborted:        { bg: 'bg-warning/10', text: 'text-warning' },
};

// ── Filter pills ─────────────────────────────────────────────────────────────

type FilterPill = 'all' | 'recon' | 'bob' | 'safety' | 'apply';

const PILLS: { key: FilterPill; label: string }[] = [
  { key: 'all',    label: 'All'    },
  { key: 'recon',  label: 'Recon'  },
  { key: 'bob',    label: 'Bob'    },
  { key: 'safety', label: 'Safety' },
  { key: 'apply',  label: 'Apply'  },
];

function matchesFilter(e: EvidenceEntry, f: FilterPill, q: string): boolean {
  const text = (e.summary + ' ' + e.stage + ' ' + (e.mode ?? '')).toLowerCase();
  if (q && !text.includes(q.toLowerCase())) return false;
  if (f === 'all') return true;
  if (f === 'recon')  return e.stage === 'recon';
  if (f === 'bob')    return e.stage === 'fan-out' || e.eventType.startsWith('bob-');
  if (f === 'safety') return e.stage === 'safety-gate';
  if (f === 'apply')  return e.stage === 'apply' || e.stage === 'done';
  return true;
}

// ── Ghost row empty state ────────────────────────────────────────────────────

function GhostRow() {
  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-[var(--border-subtle)] last:border-0 animate-ghost-pulse">
      <div className="w-4 h-4 rounded bg-[var(--border-subtle)] mt-0.5 shrink-0" />
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex gap-1.5">
          <div className="w-12 h-3 rounded bg-[var(--border-subtle)]" />
          <div className="w-20 h-3 rounded bg-[var(--border-subtle)]" />
        </div>
        <div className="w-48 h-2.5 rounded bg-[var(--border-subtle)]" />
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function LiveLog({ entries }: { entries: EvidenceEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterPill>('all');
  const [query, setQuery] = useState('');

  const visible = entries.filter((e) => matchesFilter(e, filter, query));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visible.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-ink-400 uppercase tracking-widest">Evidence</span>
          <span className="text-xs font-mono text-ink-600">{entries.length} events</span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {PILLS.map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-colors focus-ring',
                filter === p.key
                  ? 'bg-cyan/15 text-cyan border border-cyan/30'
                  : 'text-ink-500 border border-[var(--border-subtle)] hover:text-ink-300',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          className="mt-1.5 w-full text-[11px] font-mono bg-transparent border-0 outline-none text-ink-300 placeholder:text-ink-700"
          spellCheck={false}
        />
      </div>

      {/* Log rows */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0 min-h-0">
        <AnimatePresence initial={false}>
          {visible.length === 0 && entries.length === 0 && (
            <div key="ghost" className="space-y-1.5 pt-2">
              <GhostRow />
              <GhostRow />
              <GhostRow />
            </div>
          )}
          {visible.length === 0 && entries.length > 0 && (
            <motion.p
              key="no-match"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-ink-700 text-xs font-mono py-4 text-center"
            >
              No events match this filter.
            </motion.p>
          )}

          {visible.map((e) => {
            const IconComp = EVENT_ICON[e.eventType] ?? Bot;
            const stage = STAGE_STYLE[e.stage] ?? { bg: 'bg-[var(--border-subtle)]', text: 'text-ink-400' };

            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="flex items-start gap-2.5 py-1.5 border-b border-[var(--border-subtle)]/60 last:border-0"
              >
                <IconComp className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', stage.text)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={cn('text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase', stage.bg, stage.text)}>
                      {e.stage}
                    </span>
                    {e.mode && (
                      <span className="text-[10px] font-mono text-ink-600 border border-[var(--border-subtle)] px-1 rounded">
                        {e.mode}
                      </span>
                    )}
                    {e.durationMs && (
                      <span className="text-[10px] font-mono text-ink-700">{e.durationMs}ms</span>
                    )}
                    {e.costEstimate != null && e.costEstimate > 0 && (
                      <span className="text-[10px] font-mono text-cyan/70">₿{e.costEstimate.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-300 leading-relaxed">{e.summary}</p>
                </div>

                <span className="text-[10px] font-mono text-ink-700 shrink-0 mt-0.5 whitespace-nowrap">
                  {formatRelativeTime(e.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

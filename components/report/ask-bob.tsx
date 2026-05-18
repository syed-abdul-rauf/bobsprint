'use client';

// Turns the static report into an interactive copilot: ask Bob follow-up
// questions about the analyzed repo. Reuses the same relay (Ask mode) the
// pipeline uses; answers are persisted on the run so they survive reloads and
// show up in history.

import { useState } from 'react';
import { Sparkles, Loader2, CornerDownLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import { runWithBob } from '@/lib/bob-shell';
import type { AutoPilotRun, BobFollowup } from '@/lib/types';

const SUGGESTIONS = [
  'What should I fix first and why?',
  'What are the biggest risks in this codebase?',
  'Is this repo safe to deploy to production?',
];

function buildPrompt(run: AutoPilotRun, question: string): string {
  const recon = run.evidence.find((e) => e.eventType === 'recon-complete')?.summary ?? '';
  const wins = run.safeWins.map((w) => `- ${w.targetPath}: ${w.description}`).join('\n');
  return [
    `You previously analyzed the repository ${run.githubUrl}.`,
    recon && `Recon: ${recon}`,
    run.executiveSummary && `Your executive summary:\n${run.executiveSummary}`,
    wins && `Proposed changes:\n${wins}`,
    '',
    `Question: ${question}`,
    'Answer concisely in plain text (max ~6 sentences). No markdown headers.',
  ].filter(Boolean).join('\n');
}

export function AskBob({ run }: { run: AutoPilotRun }) {
  const updateRun = useApp((s) => s.updateRun);
  // Select the stored value itself (a stable reference / undefined) — NEVER
  // `?? []` inside the selector: a fresh array literal each render makes
  // Zustand re-render forever ("Maximum update depth exceeded").
  const stored = useApp((s) => s.runs.find((r) => r.id === run.id)?.followups);
  const followups = stored ?? [];
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await runWithBob(buildPrompt(run, text), { mode: 'Ask' });
      if (!res.ok || !res.output.trim()) {
        setError(res.stderr?.slice(0, 160) || 'Bob did not return an answer.');
      } else {
        const entry: BobFollowup = {
          q: text,
          a: res.output.trim(),
          ts: Date.now(),
          cost: res.costEstimate,
        };
        const cur = useApp.getState().runs.find((r) => r.id === run.id);
        updateRun(run.id, {
          followups: [...(cur?.followups ?? []), entry],
          totalCost: (cur?.totalCost ?? 0) + (res.costEstimate ?? 0),
        });
        setQ('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="section-label mb-1 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-cyan" /> Ask Bob about this repo
      </h2>
      <p className="text-ink-500 text-xs mb-4">
        Bob keeps the full analysis context — ask anything about the codebase.
      </p>

      {followups.length > 0 && (
        <div className="space-y-4 mb-4">
          {followups.map((f, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2 text-sm text-ink-200">
                <span className="text-cyan font-mono shrink-0">Q:</span>
                <span className="font-medium">{f.q}</span>
              </div>
              <div className="flex gap-2 text-sm text-ink-300 leading-relaxed">
                <span className="text-violet font-mono shrink-0">A:</span>
                <span className="whitespace-pre-wrap">{f.a}</span>
              </div>
              {typeof f.cost === 'number' && f.cost > 0 && (
                <p className="text-[10px] font-mono text-ink-600 pl-6">₿{f.cost.toFixed(4)} · Bob Ask</p>
              )}
            </div>
          ))}
        </div>
      )}

      {followups.length === 0 && !busy && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-400 hover:text-ink-100 hover:border-[var(--border-active)] transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(q); }}
        className="flex items-end gap-2"
      >
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(q); } }}
          rows={2}
          placeholder="e.g. Which file is the riskiest and how would you harden it?"
          disabled={busy}
          className="flex-1 resize-none bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-[var(--border-active)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!q.trim() || busy}
          className="btn btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-40 shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
          {busy ? 'Asking Bob…' : 'Ask'}
        </button>
      </form>

      {error && <p className="text-danger text-xs mt-2 font-mono">{error}</p>}
    </div>
  );
}

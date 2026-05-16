'use client';

import { cn } from '@/lib/utils';

export function BudgetMeter({ spent, budget }: { spent: number; budget: number }) {
  const pct  = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = spent > budget;
  const near = pct >= 80 && !over;

  // Bar gradient: cyan→violet (safe) | cyan→warning (near) | danger (over)
  const gradient = over
    ? 'rgb(var(--danger))'
    : near
    ? 'linear-gradient(90deg, rgb(var(--accent-cyan)), rgb(var(--warning)))'
    : 'linear-gradient(90deg, rgb(var(--accent-cyan)), rgb(var(--accent-violet)))';

  const glow = over
    ? '0 0 10px rgb(var(--danger) / 0.55)'
    : near
    ? '0 0 8px rgb(var(--warning) / 0.45)'
    : pct > 50
    ? '0 0 6px rgb(var(--accent-cyan) / 0.30)'
    : undefined;

  return (
    <div className="flex flex-col gap-1.5" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Bobcoin budget">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-ink-500">Bobcoin budget</span>
        <span className={cn('font-bold tabular-nums', over ? 'text-danger' : near ? 'text-warning' : 'text-ink-200')}>
          ₿{spent.toFixed(2)} <span className="text-ink-600 font-normal">/ ₿{budget.toFixed(2)}</span>
        </span>
      </div>

      {/* Track */}
      <div className="h-2 rounded-full overflow-hidden bg-[var(--border-subtle)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: gradient,
            boxShadow: glow,
          }}
        />
      </div>

      {/* Status label */}
      {over ? (
        <span className="text-[10px] font-mono text-danger">
          Budget exceeded — run will stop after the current step.
        </span>
      ) : near ? (
        <span className="text-[10px] font-mono text-warning">
          {(100 - pct).toFixed(0)}% remaining — approaching limit.
        </span>
      ) : null}
    </div>
  );
}

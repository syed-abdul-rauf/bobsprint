'use client';

import { cn } from '@/lib/utils';

export function Progress({
  value,
  className,
  tone = 'blue',
  label,
  showValue = false,
}: {
  value: number;
  className?: string;
  tone?: 'blue' | 'cyan' | 'violet' | 'mint';
  label?: string;
  showValue?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  const fillTone: Record<string, string> = {
    blue:   'from-cyan to-violet',
    cyan:   'from-cyan to-violet',
    violet: 'from-violet to-cyan',
    mint:   'from-success to-cyan',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5 text-[11px] uppercase tracking-wider">
          {label && <span className="text-ink-500">{label}</span>}
          {showValue && <span className="text-ink-300 text-mono">{clamped}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-700',
            fillTone[tone],
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

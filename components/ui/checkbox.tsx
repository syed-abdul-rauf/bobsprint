'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex items-center gap-2 text-left transition-colors text-xs',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-md border transition-all',
          checked
            ? 'bg-cyan border-cyan text-base shadow-[0_0_0_3px_rgb(var(--accent-cyan)/0.20)]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-card)] group-hover:border-[var(--border-active)]',
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label && <span className={checked ? 'text-ink-100' : 'text-ink-400'}>{label}</span>}
    </button>
  );
}

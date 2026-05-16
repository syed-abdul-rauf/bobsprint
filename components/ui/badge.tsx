'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeTone =
  | 'neutral'
  | 'blue'
  | 'cyan'
  | 'violet'
  | 'mint'
  | 'amber'
  | 'coral'
  | 'outline';

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--bg-card)] text-ink-300 border border-[var(--border-subtle)]',
  blue:   'bg-cyan/10 text-cyan border border-cyan/25',
  cyan:   'bg-cyan/10 text-cyan border border-cyan/25',
  violet: 'bg-violet/10 text-violet border border-violet/25',
  mint:   'bg-success/10 text-success border border-success/25',
  amber:  'bg-warning/10 text-warning border border-warning/25',
  coral:  'bg-danger/10 text-danger border border-danger/25',
  outline: 'border border-[var(--border-subtle)] text-ink-300',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  uppercase?: boolean;
}

export function Badge({ className, tone = 'neutral', uppercase, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium',
        uppercase && 'uppercase tracking-[0.14em]',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' | 'critical' }) {
  const map = {
    low: { tone: 'neutral' as BadgeTone, label: 'Low' },
    medium: { tone: 'amber' as BadgeTone, label: 'Medium' },
    high: { tone: 'coral' as BadgeTone, label: 'High' },
    critical: { tone: 'coral' as BadgeTone, label: 'Critical' },
  } as const;
  const { tone, label } = map[severity];
  return <Badge tone={tone} uppercase>{label}</Badge>;
}

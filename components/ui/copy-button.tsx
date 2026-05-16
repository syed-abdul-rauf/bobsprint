'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from './toast';

export function CopyButton({
  value,
  label = 'Copy',
  className,
  variant = 'default',
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'subtle';
}) {
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      push({ title: 'Copied to clipboard', tone: 'success' });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      push({ title: 'Copy failed', description: 'Browser blocked clipboard access.', tone: 'error' });
    }
  }

  const base =
    variant === 'subtle'
      ? 'text-xs text-ink-400 hover:text-ink-100 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-card)] transition-colors'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-active)] border border-[var(--border-subtle)] text-ink-200 transition-colors';

  return (
    <button onClick={onClick} className={cn(base, className)} type="button">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

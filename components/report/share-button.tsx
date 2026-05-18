'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { buildSnapshot } from '@/lib/sprint-pack';
import { buildShareUrl } from '@/lib/share';
import { cn } from '@/lib/utils';
import type { AutoPilotRun } from '@/lib/types';

export function ShareButton({
  run,
  className,
  variant = 'default',
}: {
  run: AutoPilotRun;
  className?: string;
  variant?: 'default' | 'subtle';
}) {
  const { push } = useToast();
  const [done, setDone] = useState(false);

  async function share() {
    const url = buildShareUrl(buildSnapshot(run));
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BobSprint report', url });
      } else {
        await navigator.clipboard.writeText(url);
        push({ title: 'Share link copied', description: 'Read-only report — no sign-in needed.', tone: 'success' });
      }
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        push({ title: 'Share link copied', tone: 'success' });
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      } catch {
        push({ title: 'Could not copy link', tone: 'error' });
      }
    }
  }

  const base =
    variant === 'subtle'
      ? 'text-xs text-ink-400 hover:text-ink-100 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-card)] transition-colors'
      : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-active)] border border-[var(--border-subtle)] text-ink-200 transition-colors';

  return (
    <button onClick={share} className={cn(base, className)} type="button">
      {done ? <Check className="w-3.5 h-3.5 text-success" /> : <Share2 className="w-3.5 h-3.5" />}
      {done ? 'Link copied' : 'Share'}
    </button>
  );
}

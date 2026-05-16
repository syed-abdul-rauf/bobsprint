'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Brand({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2.5 group', className)}>
      <BrandMark />
      {withText && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-ink-100">
            Bob<span className="text-cyan">Sprint</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mt-0.5">
            IBM Bob · Copilot
          </div>
        </div>
      )}
    </Link>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-lg"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        style={{ filter: 'drop-shadow(0 4px 18px var(--glow-cyan))' }}
      >
        <defs>
          <linearGradient id="bm-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   style={{ stopColor: 'rgb(var(--accent-cyan))' }} />
            <stop offset="55%"  style={{ stopColor: 'rgb(var(--accent-cyan) / 0.8)' }} />
            <stop offset="100%" style={{ stopColor: 'rgb(var(--accent-violet))' }} />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#bm-grad)" />
        <path
          d="M9 9h8.5a4.5 4.5 0 0 1 1.4 8.78A4.75 4.75 0 0 1 18 23H9V9Zm3.4 2.6v3.4h4.6a1.7 1.7 0 1 0 0-3.4h-4.6Zm0 6v2.8h5a1.4 1.4 0 1 0 0-2.8h-5Z"
          fill="rgba(255,255,255,0.96)"
        />
      </svg>
    </span>
  );
}

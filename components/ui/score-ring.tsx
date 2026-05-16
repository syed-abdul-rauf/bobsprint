'use client';

import { cn } from '@/lib/utils';

export function ScoreRing({
  value,
  size = 120,
  thickness = 10,
  label,
  sublabel,
  tone = 'blue',
  className,
}: {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  sublabel?: string;
  tone?: 'blue' | 'cyan' | 'violet' | 'mint';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  const tones: Record<string, { stroke: string; glow: string; text: string }> = {
    blue:   { stroke: 'rgb(56 189 248)',  glow: 'rgb(56 189 248 / 0.45)',  text: 'text-cyan'    },
    cyan:   { stroke: 'rgb(56 189 248)',  glow: 'rgb(56 189 248 / 0.45)',  text: 'text-cyan'    },
    violet: { stroke: 'rgb(167 139 250)', glow: 'rgb(167 139 250 / 0.45)', text: 'text-violet'  },
    mint:   { stroke: 'rgb(52 211 153)',  glow: 'rgb(52 211 153 / 0.45)',  text: 'text-success' },
  };
  const t = tones[tone];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 overflow-visible">
          <defs>
            <linearGradient id={`grad-${tone}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={t.stroke} stopOpacity="0.95" />
              <stop offset="100%" stopColor={t.stroke} stopOpacity="0.65" />
            </linearGradient>
            <filter id={`glow-${tone}`}>
              <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth={thickness}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#grad-${tone})`}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            filter={`url(#glow-${tone})`}
            style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.22,0.61,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn('text-mono text-3xl font-semibold tracking-tight', t.text)}>
            {clamped}
          </div>
          {label && <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mt-0.5">{label}</div>}
        </div>
      </div>
      {sublabel && <div className="text-xs text-ink-500">{sublabel}</div>}
    </div>
  );
}

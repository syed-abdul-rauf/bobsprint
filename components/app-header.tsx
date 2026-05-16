'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, FileSearch, BarChart2, Settings2 } from 'lucide-react';
import { Brand } from './shell/brand';
import { useApp, useActiveRun } from '@/lib/store';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/run',      label: 'Run',      icon: Zap       },
  { href: '/evidence', label: 'Evidence', icon: FileSearch },
  { href: '/report',   label: 'Report',   icon: BarChart2  },
];

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const run = useActiveRun();
  const githubPat = useApp((s) => s.githubPat);
  const isRunActive = run?.stage !== undefined && run.stage !== 'idle' && run.stage !== 'done' && run.stage !== 'error' && run.stage !== 'aborted';

  return (
    <header className="sticky top-0 z-40">
      <div
        className="glass-strong border-b border-[var(--border-subtle)]"
        style={{ backdropFilter: 'saturate(160%) blur(14px)' }}
      >
        <nav className="container-app h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brand withText />
            <span className="hidden sm:block text-[10px] font-mono text-ink-600 uppercase tracking-widest select-none">
              IBM Bob Copilot
            </span>
          </div>

          <div className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring',
                    active
                      ? 'text-cyan bg-[var(--bg-card-active)]'
                      : 'text-ink-500 hover:text-ink-200 hover:bg-[var(--bg-card)]',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {/* Active underline with glow */}
                  {active && (
                    <span
                      className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full"
                      style={{
                        background: 'rgb(var(--accent-cyan))',
                        boxShadow: '0 0 8px rgb(var(--accent-cyan) / 0.8)',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {githubPat && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-success/70">
                <span className="w-1.5 h-1.5 rounded-full bg-success/70" />
                PAT
              </span>
            )}
            {children}
            <Link
              href="/settings"
              className={cn(
                'relative flex items-center justify-center h-9 w-9 rounded-lg transition-colors focus-ring',
                'border border-[var(--border-subtle)]',
                'text-ink-400 hover:text-ink-100 hover:bg-[var(--bg-card)]',
              )}
              aria-label="Settings"
              title="Settings"
            >
              <Settings2 className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </div>

      {/* Cyan pulse line — only visible during an active run */}
      {isRunActive && (
        <div className="h-px w-full bg-cyan/60 animate-header-pulse" />
      )}
    </header>
  );
}

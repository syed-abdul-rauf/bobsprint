'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useApp, useResolvedTheme } from '@/lib/store';
import { cn } from '@/lib/utils';

const ICONS = { dark: Moon, light: Sun, system: Monitor } as const;
const LABELS = {
  dark:   'Switch to light theme',
  light:  'Switch to system theme',
  system: 'Switch to dark theme',
} as const;
const NEXT_LABEL = {
  dark:   'Dark',
  light:  'Light',
  system: 'System',
} as const;

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  const resolved = useResolvedTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Render Moon on server — the pre-paint script has already applied the right class,
  // so there is no visible flash. suppressHydrationWarning avoids the React console error.
  const Icon = mounted ? ICONS[resolved] : Moon;
  const ariaLabel = LABELS[theme];

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg',
        'border border-[var(--border-subtle)]',
        'text-ink-400 hover:text-ink-100',
        'hover:bg-[var(--bg-card)] transition-colors duration-150',
        'focus-ring',
        className,
      )}
      aria-label={ariaLabel}
      aria-live="polite"
      title={`Theme: ${NEXT_LABEL[theme]}`}
    >
      <span className="transition-transform duration-300" style={{ display: 'inline-flex' }}>
        <Icon className="h-4 w-4" />
      </span>
    </button>
  );
}

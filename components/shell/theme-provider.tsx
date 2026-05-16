'use client';

import { useEffect } from 'react';
import { useApp } from '@/lib/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);

  useEffect(() => {
    // Apply class immediately when theme changes
    const dark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);

    // When in system mode, react to OS preference changes live
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, setTheme]);

  return <>{children}</>;
}

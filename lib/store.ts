'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AutoPilotRun } from './types';

export type ThemePreference = 'dark' | 'light' | 'system';

interface AppStore {
  theme: ThemePreference;
  githubPat: string;
  bobcoinBudget: number;
  runs: AutoPilotRun[];
  activeRunId: string | null;
  hydrated: boolean;

  setHydrated: (v: boolean) => void;
  setTheme: (t: ThemePreference) => void;
  toggleTheme: () => void;
  setGithubPat: (pat: string) => void;
  setBobcoinBudget: (n: number) => void;
  addRun: (run: AutoPilotRun) => void;
  updateRun: (id: string, patch: Partial<AutoPilotRun>) => void;
  setActiveRun: (id: string | null) => void;
  deleteRun: (id: string) => void;
}

// BobSprint is a dark-only product — its surfaces, gradients, and contrast are
// designed exclusively for dark. Light/system would render unreadable, so the
// `.dark` class is always on regardless of stored or OS preference.
function applyThemeClass(_theme: ThemePreference) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('dark');
}

function writeThemeKey(theme: ThemePreference) {
  try {
    localStorage.setItem('bobsprint:theme', theme);
  } catch {}
}

const THEME_CYCLE: ThemePreference[] = ['dark', 'light', 'system'];

export const useApp = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      githubPat: '',
      bobcoinBudget: 2,
      runs: [],
      activeRunId: null,
      hydrated: false,

      setHydrated: (v) => set({ hydrated: v }),

      setTheme: (theme) => {
        set({ theme });
        writeThemeKey(theme);
        applyThemeClass(theme);
      },

      toggleTheme: () => {
        const cur = get().theme;
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length];
        get().setTheme(next);
      },

      setGithubPat: (githubPat) => set({ githubPat }),
      setBobcoinBudget: (bobcoinBudget) => set({ bobcoinBudget }),

      addRun: (run) => set((s) => ({ runs: [run, ...s.runs], activeRunId: run.id })),

      updateRun: (id, patch) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      setActiveRun: (id) => set({ activeRunId: id }),

      deleteRun: (id) =>
        set((s) => {
          const remaining = s.runs.filter((r) => r.id !== id);
          const nextActive =
            s.activeRunId === id ? (remaining[0]?.id ?? null) : s.activeRunId;
          return { runs: remaining, activeRunId: nextActive };
        }),
    }),
    {
      name: 'bobsprint-store',
      version: 5,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : (null as unknown as Storage),
      ),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHydrated(true);
        // Sync bobsprint:theme key → class (in case zustand hydrates after pre-paint)
        const stored = typeof window !== 'undefined'
          ? localStorage.getItem('bobsprint:theme') as ThemePreference | null
          : null;
        const resolved = stored ?? state.theme;
        applyThemeClass(resolved);
        if (stored && stored !== state.theme) set({ theme: resolved });
      },
      migrate: (_persisted: unknown) => ({
        runs: [],
        activeRunId: null,
        theme: 'system' as ThemePreference,
        githubPat: '',
        bobcoinBudget: 2,
      }),
      partialize: (s) => ({
        runs: s.runs,
        activeRunId: s.activeRunId,
        theme: s.theme,
        githubPat: s.githubPat,
        bobcoinBudget: s.bobcoinBudget,
      }),
    },
  ),
);

// Inline `set` reference needed inside onRehydrateStorage above
function set(partial: Partial<AppStore>) {
  useApp.setState(partial);
}

export function useActiveRun(): AutoPilotRun | null {
  const { runs, activeRunId } = useApp();
  return runs.find((r) => r.id === activeRunId) ?? null;
}

export function useResolvedTheme(): 'dark' | 'light' {
  const theme = useApp((s) => s.theme);
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

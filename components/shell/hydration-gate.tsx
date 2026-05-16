'use client';

import { useApp } from '@/lib/store';

export function HydrationGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  if (!hydrated) {
    return (
      <>
        {fallback ?? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-cyan/40 border-t-cyan animate-spin" />
          </div>
        )}
      </>
    );
  }
  return <>{children}</>;
}

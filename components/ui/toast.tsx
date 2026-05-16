'use client';

import * as React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextShape {
  push: (t: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextShape | null>(null);

export function useToast(): ToastContextShape {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return { push: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { id, tone: 'info', ...t }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]">
        {items.map((t) => (
          <ToastBanner key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBanner({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? AlertTriangle : Info;
  const tone =
    item.tone === 'success'
      ? 'border-success/30 bg-success/[0.06]'
      : item.tone === 'error'
        ? 'border-danger/30 bg-danger/[0.06]'
        : 'border-[var(--border-subtle)] bg-[var(--bg-card)]';
  const iconTone =
    item.tone === 'success' ? 'text-success' : item.tone === 'error' ? 'text-danger' : 'text-cyan';

  return (
    <div
      className={cn(
        'pointer-events-auto glass-strong rounded-xl p-3 shadow-soft animate-fade-up flex items-start gap-2.5',
        tone,
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconTone)} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-100 font-medium leading-tight">{item.title}</div>
        {item.description && <div className="text-xs text-ink-400 mt-1">{item.description}</div>}
      </div>
      <button
        onClick={onClose}
        className="text-ink-500 hover:text-ink-100 -mr-1 -mt-1 rounded-md p-1 hover:bg-[var(--bg-card)]"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

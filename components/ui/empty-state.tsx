'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'card p-10 sm:p-14 text-center bg-grid-fine relative overflow-hidden',
        className,
      )}
    >
      <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
      <div className="relative">
        {icon && (
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-cyan">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-ink-100">{title}</h3>
        {description && (
          <p className="text-sm text-ink-400 mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
        )}
        {action && (
          <div className="mt-6">
            <Button
              onClick={() => {
                if (action.onClick) action.onClick();
                if (action.href) window.location.href = action.href;
              }}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

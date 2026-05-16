'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-[var(--bg-card)]',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-[var(--border-subtle)] before:to-transparent',
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5 sm:p-6 space-y-3', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-7 space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16" />
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <SkeletonCard className="lg:col-span-2 h-[280px]" />
        <SkeletonCard className="h-[280px]" />
      </div>
    </div>
  );
}

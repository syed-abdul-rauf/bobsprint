'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('card overflow-hidden', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 sm:p-6 flex items-start justify-between gap-3', className)} {...props} />
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2.5', className)} {...props}>
    {children}
  </div>
);

export const CardBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 sm:p-6 pt-0', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'p-5 sm:p-6 pt-4 border-t border-white/5 light:border-ink-200',
      className,
    )}
    {...props}
  />
);

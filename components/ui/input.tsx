'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('field', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('field min-h-[120px] resize-y leading-relaxed text-mono', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-200">
        {children}
      </label>
      {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
    </div>
  );
}

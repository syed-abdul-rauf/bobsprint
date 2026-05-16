'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  ghost: 'btn btn-ghost',
  subtle:
    'btn bg-transparent text-ink-300 hover:text-ink-100 hover:bg-[var(--bg-card)] border border-transparent',
  danger:
    'btn text-danger bg-danger/[0.08] border border-danger/30 hover:bg-danger/[0.14]',
  outline:
    'btn bg-transparent border border-cyan/40 text-cyan hover:bg-cyan/[0.08]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-[15px] px-5 py-3 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          variantClass[variant],
          sizeClass[size],
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

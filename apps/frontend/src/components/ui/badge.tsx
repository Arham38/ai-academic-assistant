import * as React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'clean'
  | 'flagged'
  | 'processing'
  | 'pending';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-indigo-600 text-white shadow-xs hover:bg-indigo-700',
  secondary: 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200',
  destructive: 'border-transparent bg-rose-600 text-white shadow-xs hover:bg-rose-700',
  outline: 'border-slate-300 text-slate-700 bg-transparent',
  clean: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
  flagged: 'border-rose-200 bg-rose-50 text-rose-700 font-semibold',
  processing: 'border-amber-200 bg-amber-50 text-amber-700 font-semibold',
  pending: 'border-amber-200 bg-amber-50 text-amber-700 font-semibold',
};

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20',
          badgeVariants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';

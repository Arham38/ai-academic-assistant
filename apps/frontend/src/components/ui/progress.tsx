import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
  showLabel?: boolean;
}

/**
 * Accessible progress bar primitive supporting percentage visualization and ARIA attributes.
 */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, showLabel = false, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, Math.round((value / max) * 100)), 100);

    return (
      <div className={cn('w-full space-y-1.5', className)} ref={ref} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Progress</span>
            <span aria-hidden="true">{percentage}%</span>
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={props['aria-label'] || 'Upload progress'}
          className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className={cn(
              'h-full bg-indigo-600 transition-all duration-300 ease-out rounded-full',
              indicatorClassName,
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  },
);

Progress.displayName = 'Progress';

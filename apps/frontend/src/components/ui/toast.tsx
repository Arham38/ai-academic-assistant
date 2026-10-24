import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title?: string;
  message: string;
  onClose?: () => void;
}

const variantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  success: {
    container:
      'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
  error: {
    container:
      'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200',
    icon: <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
  },
  warning: {
    container:
      'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200',
    icon: <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
  },
  info: {
    container:
      'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200',
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />,
  },
};

/**
 * Toast / Alert banner notification primitive.
 */
export const Toast: React.FC<ToastProps> = ({
  variant = 'info',
  title,
  message,
  onClose,
  className,
  ...props
}) => {
  const { container, icon } = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start p-4 rounded-xl border text-sm shadow-sm transition-all',
        container,
        className,
      )}
      {...props}
    >
      <div className="mr-3 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-3 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity focus:outline-hidden focus:ring-2 focus:ring-offset-1"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

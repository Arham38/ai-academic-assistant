import React from 'react';
import { FileText, X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../utils/cn';

export type UploadProgressStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadProgressProps {
  file: File;
  progress: number;
  status: UploadProgressStatus;
  errorMessage?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Visual feedback component rendering real-time transmission progress,
 * file metadata, and user cancellation/retry controls.
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({
  file,
  progress,
  status,
  errorMessage,
  onCancel,
  onRetry,
  className,
}) => {
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const isProcessing = status === 'processing';
  const isUploading = status === 'uploading';

  return (
    <div
      role="region"
      aria-label="Upload progress"
      className={cn(
        'w-full p-6 sm:p-7 rounded-2xl border transition-all duration-200 bg-card text-card-foreground shadow-xs',
        isError
          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
          : isSuccess
            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Document Icon & Title Info */}
        <div className="flex items-start space-x-3.5 min-w-0 flex-1">
          <div
            className={cn(
              'p-3 rounded-xl shrink-0 transition-colors',
              isError
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : isSuccess
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
            )}
          >
            {isError ? (
              <AlertCircle className="w-6 h-6" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className="text-sm sm:text-base font-semibold text-foreground truncate"
              title={file.name}
            >
              {file.name}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span className="uppercase font-medium">{file.name.split('.').pop() || 'FILE'}</span>
            </div>
          </div>
        </div>

        {/* Cancellation or Retry Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
              aria-label="Retry upload"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </button>
          )}

          {isUploading && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cancel upload"
              aria-label="Cancel upload"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Visualization */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            {isError
              ? 'Upload failed'
              : isSuccess
                ? 'Upload complete'
                : isProcessing
                  ? 'Finalizing document record...'
                  : 'Uploading manuscript...'}
          </span>
          <span className="font-semibold text-foreground">{isError ? '0%' : `${progress}%`}</span>
        </div>

        <Progress
          value={isError ? 0 : progress}
          indicatorClassName={cn(
            isError ? 'bg-rose-500' : isSuccess ? 'bg-emerald-500' : 'bg-indigo-600',
          )}
        />
      </div>

      {/* Error Detail Callout */}
      {isError && errorMessage && (
        <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-medium">{errorMessage}</p>
      )}

      {/* Success Confirmation Callout */}
      {isSuccess && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          Document registered in PENDING status. Navigating to document workspace...
        </p>
      )}
    </div>
  );
};

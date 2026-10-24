import React from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, ACCEPTED_EXTENSIONS_LABEL } from '../constants';

export interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Enterprise Drag-and-Drop file intake component with client-side validation.
 * Visually rejects unsupported formats or oversized files prior to network transmission.
 */
export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  onError,
  disabled = false,
  className,
}) => {
  const onDropAccepted = (files: File[]) => {
    if (files.length > 0 && files[0]) {
      onFileSelected(files[0]);
    }
  };

  const onDropRejected = (fileRejections: FileRejection[]) => {
    const firstRejection = fileRejections[0];
    if (!firstRejection) return;

    const error = firstRejection.errors[0];
    if (!error) return;

    let friendlyMessage = 'File upload rejected.';
    if (error.code === 'file-too-large') {
      friendlyMessage = `File size exceeds the 10MB limit (${(firstRejection.file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller document.`;
    } else if (error.code === 'file-invalid-type') {
      friendlyMessage = `Unsupported file format. Please upload an academic paper in ${ACCEPTED_EXTENSIONS_LABEL} format.`;
    } else if (error.code === 'too-many-files') {
      friendlyMessage = 'Only one document can be uploaded at a time.';
    } else {
      friendlyMessage = error.message;
    }

    onError?.(friendlyMessage);
  };

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, isFocused } =
    useDropzone({
      accept: ACCEPTED_FILE_TYPES,
      maxSize: MAX_FILE_SIZE_BYTES,
      multiple: false,
      disabled,
      onDropAccepted,
      onDropRejected,
    });

  return (
    <div
      {...getRootProps()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload document drag and drop area"
      className={cn(
        'relative group flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none',
        // Default idle state
        'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/20 dark:hover:bg-slate-900/60 hover:border-indigo-400 dark:hover:border-indigo-500',
        // Focus state (keyboard a11y)
        isFocused && 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-500',
        // Drag active & accepted
        isDragActive &&
          isDragAccept &&
          'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 scale-[1.01] shadow-md',
        // Drag active & rejected
        isDragReject && 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40',
        // Disabled state
        disabled && 'opacity-60 cursor-not-allowed hover:border-slate-300 hover:bg-slate-50/50',
        className,
      )}
    >
      <input {...getInputProps({ disabled })} aria-hidden="true" />

      {/* Floating Icon Container */}
      <div
        className={cn(
          'p-4 rounded-2xl mb-4 transition-all duration-200 shadow-xs',
          isDragReject
            ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'
            : isDragActive
              ? 'bg-indigo-600 text-white scale-110 shadow-indigo-500/25'
              : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white',
        )}
      >
        {isDragReject ? (
          <AlertCircle className="w-8 h-8" />
        ) : isDragActive ? (
          <UploadCloud className="w-8 h-8 animate-bounce" />
        ) : (
          <UploadCloud className="w-8 h-8" />
        )}
      </div>

      {/* Dynamic Instruction Labels */}
      {isDragReject ? (
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400">
            Unsupported File Format or Size
          </p>
          <p className="text-xs text-rose-500 dark:text-rose-400/80">
            Only single PDF, DOCX, or TXT documents under 10MB are permitted.
          </p>
        </div>
      ) : isDragActive ? (
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-bold text-indigo-700 dark:text-indigo-300">
            Release to ingest manuscript
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            File will be validated and queued for vector embedding.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
            <span>Drag and drop your manuscript here, or </span>
            <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700">
              browse files
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Upload institutional papers, course essays, or research drafts for AI-powered integrity
            analysis and citation verification.
          </p>

          {/* Formats and Size Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <FileText className="w-3 h-3 mr-1 text-slate-400" />
              PDF, DOCX, TXT
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Max 10 MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

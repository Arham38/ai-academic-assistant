import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Cpu, Database } from 'lucide-react';
import { UploadDropzone } from '../components/UploadDropzone';
import { UploadProgress, UploadProgressStatus } from '../components/UploadProgress';
import { Toast } from '../../../components/ui/toast';
import { useUploadDocumentMutation, type UploadDocumentError } from '../documentApiSlice';

/**
 * Dedicated document ingestion view.
 * Manages reactive upload state transitions (Idle -> Uploading -> Processing -> Success/Error)
 * and navigates to the newly created document's workspace upon completion.
 */
export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [uploadDocument] = useUploadDocumentMutation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<UploadProgressStatus>('idle');
  const [toastError, setToastError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startUpload = async (file: File) => {
    setToastError(null);
    setSelectedFile(file);
    setProgress(0);
    setStatus('uploading');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await uploadDocument({
        file,
        signal: controller.signal,
        onProgress: (percent) => {
          setProgress(percent);
          if (percent >= 100) {
            setStatus('processing');
          }
        },
      });

      if ('error' in response) {
        const error = response.error as unknown as UploadDocumentError;
        if (error.data?.detail?.includes('aborted by user')) {
          setStatus('idle');
          setSelectedFile(null);
          setProgress(0);
          return;
        }

        setStatus('error');
        setToastError(
          error.data?.detail ||
            error.data?.message ||
            'Failed to upload manuscript. Please check your network and try again.',
        );
        return;
      }

      if (response.data) {
        setStatus('success');
        const documentId = response.data.data.document.id;

        // Brief delay so user perceives completion before redirection
        setTimeout(() => {
          navigate(`/documents/${documentId}/overview`);
        }, 800);
      }
    } catch (err: unknown) {
      setStatus('error');
      setToastError((err as Error)?.message || 'An unexpected error occurred during upload.');
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    setSelectedFile(null);
    setProgress(0);
  };

  const handleRetry = () => {
    if (selectedFile) {
      startUpload(selectedFile);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Navigation & Header */}
      <div>
        <Link
          to="/documents"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Documents Library
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Upload Academic Manuscript
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
          Submit course papers, dissertations, or research drafts for AI-driven plagiarism
          detection, citation integrity validation, and semantic vector indexing.
        </p>
      </div>

      {/* Floating Error Notification */}
      {toastError && status === 'idle' && (
        <Toast
          variant="error"
          title="File Validation Failed"
          message={toastError}
          onClose={() => setToastError(null)}
        />
      )}

      {/* Main Upload Interactive Zone */}
      <div className="bg-card text-card-foreground rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
        {status === 'idle' ? (
          <UploadDropzone onFileSelected={startUpload} onError={(msg) => setToastError(msg)} />
        ) : selectedFile ? (
          <UploadProgress
            file={selectedFile}
            progress={progress}
            status={status}
            errorMessage={toastError || undefined}
            onCancel={handleCancel}
            onRetry={handleRetry}
          />
        ) : null}
      </div>

      {/* Security & Processing Pipeline Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-2">
          <div className="p-2 w-fit rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Zero Retention Threat</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your intellectual property is never shared with external LLM training pools or public
            registries.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-2">
          <div className="p-2 w-fit rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Agentic Decomposition</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Academic manuscripts undergo OCR parsing, recursive chunking, and semantic tokenization.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-2">
          <div className="p-2 w-fit rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Isolated Vector Storage</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            1536-dimensional embeddings are indexed in user-scoped ChromaDB collections with strict
            IDOR controls.
          </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  History,
  GitCommit,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  UploadCloud,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

export interface DocumentVersionItem {
  versionId: string;
  versionNumber: number;
  originalFilename: string;
  storageUri: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  metadata?: {
    wordCount?: number;
    pageCount?: number;
    title_extracted?: string;
    authors?: string[];
    abstract?: string;
    keywords?: string[];
    language?: string;
    [key: string]: unknown;
  };
  uploadedAt: string | Date;
}

export interface VersionHistoryTimelineProps {
  versions: DocumentVersionItem[];
  activeVersionId: string;
  selectedVersionId?: string;
  onSelectVersion?: (version: DocumentVersionItem) => void;
  onRestoreVersion?: (versionId: string) => void;
  onUploadNewVersion?: () => void;
  isRestoring?: boolean;
}

export const VersionHistoryTimeline: React.FC<VersionHistoryTimelineProps> = ({
  versions,
  activeVersionId,
  selectedVersionId,
  onSelectVersion,
  onRestoreVersion,
  onUploadNewVersion,
  isRestoring = false,
}) => {
  // Sort versions descending (latest version on top)
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateInput: string | Date): string => {
    try {
      const date = new Date(dateInput);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateInput);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return (
          <Badge variant="clean" className="space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Ready</span>
          </Badge>
        );
      case 'PARSING':
      case 'EMBEDDING':
        return (
          <Badge variant="info" className="space-x-1 animate-pulse">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>{status}</span>
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="default" className="space-x-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Queued</span>
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="flagged" className="space-x-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <Card className="border border-slate-200/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base font-bold text-slate-900">Version History</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Immutable timeline of uploaded document revisions and analysis passes.
          </CardDescription>
        </div>

        {onUploadNewVersion && (
          <button
            type="button"
            onClick={onUploadNewVersion}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Version</span>
          </button>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {sortedVersions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No version history recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {sortedVersions.map((version) => {
              const isActive = version.versionId === activeVersionId;
              const isSelected = selectedVersionId
                ? version.versionId === selectedVersionId
                : isActive;

              return (
                <div
                  key={version.versionId}
                  className={`relative group rounded-xl p-4 transition-all border ${
                    isSelected
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                      : 'bg-white hover:bg-slate-50/70 border-slate-200/80'
                  }`}
                  data-testid={`version-item-${version.versionNumber}`}
                >
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-[27px] top-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                      isActive
                        ? 'bg-indigo-600 text-white ring-indigo-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          Version {version.versionNumber}
                        </span>
                        {isActive && (
                          <Badge
                            variant="clean"
                            className="bg-indigo-100/80 text-indigo-700 border-indigo-200"
                          >
                            Active
                          </Badge>
                        )}
                        {getStatusBadge(version.status)}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs font-medium text-slate-700">
                          {version.originalFilename}
                        </span>
                        <span>&bull;</span>
                        <span>{formatFileSize(version.sizeBytes)}</span>
                        {version.metadata?.wordCount !== undefined && (
                          <>
                            <span>&bull;</span>
                            <span>{version.metadata.wordCount.toLocaleString()} words</span>
                          </>
                        )}
                        {version.metadata?.pageCount !== undefined && (
                          <>
                            <span>&bull;</span>
                            <span>{version.metadata.pageCount} pages</span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center space-x-1 pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Uploaded {formatDate(version.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
                      {onSelectVersion && (
                        <button
                          type="button"
                          onClick={() => onSelectVersion(version)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      )}

                      {!isActive && onRestoreVersion && (
                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => onRestoreVersion(version.versionId)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

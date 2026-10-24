import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  MoreVertical,
  ExternalLink,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../../components/ui/card';
import { cn } from '../../../utils/cn';

export type DocumentStatus = 'CLEAN' | 'FLAGGED' | 'PROCESSING' | 'PENDING';

export interface RecentDocumentItem {
  id: string;
  title: string;
  status: DocumentStatus;
  date: string;
  fileSize?: string;
  similarityScore?: number;
}

export interface RecentDocumentsTableProps {
  documents: RecentDocumentItem[];
  onViewReport?: (docId: string) => void;
  onDeleteDocument?: (docId: string) => void;
  onUploadClick?: () => void;
  className?: string;
}

export const RecentDocumentsTable: React.FC<RecentDocumentsTableProps> = ({
  documents,
  onViewReport,
  onDeleteDocument,
  onUploadClick,
  className,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'CLEAN':
        return (
          <Badge variant="clean" className="space-x-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Clean</span>
          </Badge>
        );
      case 'FLAGGED':
        return (
          <Badge variant="flagged" className="space-x-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Flagged</span>
          </Badge>
        );
      case 'PROCESSING':
      case 'PENDING':
      default:
        return (
          <Badge variant="processing" className="space-x-1">
            <Clock className="w-3 h-3 shrink-0 animate-spin" />
            <span>{status === 'PROCESSING' ? 'Scanning...' : 'Pending'}</span>
          </Badge>
        );
    }
  };

  // 1. Empty State
  if (documents.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Recently scanned academic manuscripts and integrity reports
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-foreground mb-1">No documents uploaded yet</h4>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            Upload your first research paper, thesis draft, or course assignment to begin automated
            plagiarism detection and AI citation analysis.
          </p>
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <Upload className="w-3.5 h-3.5 mr-2" />
            Upload Your First Document
          </button>
        </CardContent>
      </Card>
    );
  }

  // 2. Active Table Render
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 py-4 px-6">
        <div>
          <CardTitle className="text-base font-bold text-foreground">Recent Documents</CardTitle>
          <CardDescription>
            Last {documents.length} manuscripts processed through the multi-agent integrity engine
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
            <FileCheck className="w-3 h-3 mr-1 text-emerald-600" />
            Verified Sync
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table className="min-w-[540px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[42%] min-w-[180px]">Document</TableHead>
              <TableHead className="whitespace-nowrap">Upload Date</TableHead>
              <TableHead className="whitespace-nowrap">Similarity</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} className="group">
                {/* Document Title & Icon */}
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="font-semibold text-foreground block truncate hover:text-indigo-600 transition-colors cursor-pointer"
                        onClick={() => onViewReport?.(doc.id)}
                      >
                        {doc.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {doc.fileSize ?? '2.4 MB'} &bull; PDF Manuscript
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Upload Date */}
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {doc.date}
                </TableCell>

                {/* Similarity Score */}
                <TableCell className="whitespace-nowrap">
                  {doc.similarityScore !== undefined ? (
                    <span
                      className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded-md inline-block',
                        doc.similarityScore > 15
                          ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
                      )}
                    >
                      {doc.similarityScore}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Calculating...</span>
                  )}
                </TableCell>

                {/* Status Badge */}
                <TableCell className="whitespace-nowrap">{getStatusBadge(doc.status)}</TableCell>

                {/* Actions Dropdown */}
                <TableCell className="text-right relative whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                    aria-label={`Actions for ${doc.title}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === doc.id && (
                    <div
                      ref={menuRef}
                      role="menu"
                      aria-label="Document options"
                      className="absolute right-4 mt-1 w-44 rounded-xl bg-card shadow-lg border border-border z-30 py-1 divide-y divide-border text-left animate-in fade-in-0 zoom-in-95 duration-100"
                    >
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onViewReport?.(doc.id);
                          }}
                          className="w-full flex items-center px-3 py-2 text-xs text-foreground hover:bg-muted hover:text-indigo-600 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          View Integrity Report
                        </button>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDeleteDocument?.(doc.id);
                          }}
                          className="w-full flex items-center px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-500" />
                          Delete Document
                        </button>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="py-3 px-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing <strong className="text-foreground">{documents.length}</strong> of{' '}
                    <strong className="text-foreground">{documents.length}</strong> recent items
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled
                      className="px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-card cursor-not-allowed opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-card cursor-not-allowed opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
};

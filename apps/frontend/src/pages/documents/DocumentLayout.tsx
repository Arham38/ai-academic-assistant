import React from 'react';
import { useParams, Outlet, Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  Download,
  Calendar,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { Tabs, TabItem } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

export interface DocumentLayoutProps {
  documentTitle?: string;
}

export const DocumentLayout: React.FC<DocumentLayoutProps> = ({ documentTitle }) => {
  const { documentId = 'doc-1' } = useParams<{ documentId: string }>();

  // Determine human-readable title
  const displayTitle =
    documentTitle ||
    (documentId === 'doc-1'
      ? 'Quantum_Entanglement_Cryptography_Thesis.pdf'
      : documentId === 'doc-2'
        ? 'Neural_Symbolic_Reasoning_Survey.docx'
        : `Document_${documentId.replace(/^doc-/, '')}.pdf`);

  const tabs: TabItem[] = [
    {
      label: 'Overview',
      path: `/documents/${documentId}/overview`,
      icon: FileText,
    },
    {
      label: 'AI Synthesis Chat',
      path: `/documents/${documentId}/chat`,
      icon: MessageSquare,
      badge: 'RAG',
    },
    {
      label: 'Integrity Report',
      path: `/documents/${documentId}/report`,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Return to Repository Link */}
      <div>
        <Link
          to="/documents"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to All Documents</span>
        </Link>
      </div>

      {/* 2. Document Master Header Banner */}
      <Card className="p-6 bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start space-x-4 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs shrink-0">
              <FileText className="w-7 h-7" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate max-w-xl">
                  {displayTitle}
                </h2>
                <Badge variant="clean" className="space-x-1">
                  <FileCheck className="w-3 h-3" />
                  <span>Verified Clean (2.1%)</span>
                </Badge>
              </div>

              <div className="flex flex-wrap items-center text-xs text-slate-500 gap-y-1 gap-x-4">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Uploaded Oct 24, 2026
                </span>
                <span>&bull;</span>
                <span>4.8 MB &bull; PDF Manuscript</span>
                <span>&bull;</span>
                <span className="text-indigo-600 font-semibold flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  ChromaDB Embeddings Synced
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Download PDF
            </button>
          </div>
        </div>

        {/* 3. URL-Driven Tabbed Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <Tabs tabs={tabs} ariaLabel="Document Section Views" />
        </div>
      </Card>

      {/* 4. Active Sub-View Outlet Container */}
      <div className="min-h-[420px]">
        <Outlet />
      </div>
    </div>
  );
};

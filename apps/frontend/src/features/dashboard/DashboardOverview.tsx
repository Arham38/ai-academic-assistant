import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  Zap,
  BookOpen,
  Users,
  Activity,
  Database,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/hooks/useAuth';
import { formatUserDisplayName } from '../../utils/userUtils';
import { MetricCard } from './components/MetricCard';
import { RecentDocumentsTable, RecentDocumentItem } from './components/RecentDocumentsTable';
import { QuickActions } from './components/QuickActions';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { useGetDashboardSummaryQuery } from './dashboardApiSlice';

export interface DashboardOverviewProps {
  isLoading?: boolean;
  documents?: RecentDocumentItem[];
  metrics?: {
    documentsScanned?: number;
    averagePlagiarism?: number;
    tokensRemaining?: number;
    totalUsers?: number;
    systemHealth?: string;
  };
  onUploadClick?: () => void;
}

const DEFAULT_DOCUMENTS: RecentDocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Quantum_Entanglement_Cryptography_Thesis.pdf',
    status: 'CLEAN',
    date: 'Oct 24, 2026',
    fileSize: '4.8 MB',
    similarityScore: 2.1,
  },
  {
    id: 'doc-2',
    title: 'Neural_Symbolic_Reasoning_Survey.docx',
    status: 'FLAGGED',
    date: 'Oct 23, 2026',
    fileSize: '1.9 MB',
    similarityScore: 24.5,
  },
  {
    id: 'doc-3',
    title: 'Distributed_Consensus_Protocols_Draft.pdf',
    status: 'CLEAN',
    date: 'Oct 22, 2026',
    fileSize: '3.2 MB',
    similarityScore: 4.8,
  },
  {
    id: 'doc-4',
    title: 'Biomedical_Genomics_RAG_Pipeline.pdf',
    status: 'PROCESSING',
    date: 'Oct 21, 2026',
    fileSize: '8.4 MB',
  },
  {
    id: 'doc-5',
    title: 'Computational_Linguistics_Corpus_Analysis.docx',
    status: 'CLEAN',
    date: 'Oct 20, 2026',
    fileSize: '2.7 MB',
    similarityScore: 1.2,
  },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  isLoading: propIsLoading,
  documents: propDocuments,
  metrics: propMetrics,
  onUploadClick,
}) => {
  const { user, role, isAdmin, isResearcher } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading: queryLoading } = useGetDashboardSummaryQuery();

  const isLoading = propIsLoading !== undefined ? propIsLoading : queryLoading;
  const documents = propDocuments ?? data?.recentDocuments ?? DEFAULT_DOCUMENTS;
  const metrics = propMetrics ??
    data?.metrics ?? {
      documentsScanned: 18,
      averagePlagiarism: 3.4,
      tokensRemaining: 48500,
      totalUsers: 1420,
      systemHealth: '99.98%',
    };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const handleUpload = () => {
    if (onUploadClick) {
      onUploadClick();
    } else {
      navigate('/documents');
    }
  };

  const handleViewReport = (docId: string) => {
    navigate(`/documents?selected=${docId}`);
  };

  const handleDeleteDocument = (docId: string) => {
    // Handled in downstream feature slices
    console.info(`Delete requested for document: ${docId}`);
  };

  const currentDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const displayName = formatUserDisplayName(user);

  return (
    <div className="space-y-6">
      {/* 1. Welcome Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Welcome back, {displayName}
            </h1>
            <span className="text-xl" role="img" aria-label="waving hand">
              👋
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center space-x-2">
            <span>Academic workspace initialized for</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3 h-3 mr-1" />
              {role ?? 'STUDENT'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium text-muted-foreground bg-muted/50 border border-border px-3 py-2 rounded-xl self-start sm:self-auto shrink-0">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{currentDateFormatted}</span>
        </div>
      </div>

      {/* 2. Top-Level Metric Cards Grid (Responsive 1 -> 2 -> 4 Columns) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Documents Scanned */}
        <MetricCard
          title="Documents Scanned"
          value={metrics.documentsScanned ?? 18}
          icon={FileText}
          trend={{ value: '+12% this mo', isPositive: true }}
          description="Verified originality checks"
        />

        {/* Metric 2: Average Plagiarism Score */}
        <MetricCard
          title="Avg Plagiarism"
          value={`${metrics.averagePlagiarism ?? 3.4}%`}
          icon={ShieldCheck}
          trend={{ value: '-0.8% decrease', isPositive: true }}
          description="Institutional average 12.4%"
        />

        {/* Metric 3: Role-Adapted (Tokens Remaining for Student/Researcher vs Total Users for Admin) */}
        {isAdmin ? (
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers?.toLocaleString() ?? '1,420'}
            icon={Users}
            trend={{ value: '+14 new', isPositive: true, label: 'this week' }}
            description="Active institutional seats"
            badge="Admin"
          />
        ) : (
          <MetricCard
            title="AI Tokens Left"
            value={metrics.tokensRemaining?.toLocaleString() ?? '48,500'}
            icon={Zap}
            trend={{ value: '48.5% left', isPositive: true }}
            description="Refreshes on the 1st"
          />
        )}

        {/* Metric 4: Role-Adapted (Citations for Student, Embeddings for Researcher, Cluster Health for Admin) */}
        {isAdmin ? (
          <MetricCard
            title="System Cluster"
            value={metrics.systemHealth ?? '99.98%'}
            icon={Activity}
            trend={{ value: 'Nominal', isPositive: true }}
            description="All microservices operational"
            badge="System"
          />
        ) : isResearcher ? (
          <MetricCard
            title="Vector Index"
            value="124k chunks"
            icon={Database}
            trend={{ value: 'Synced', isPositive: true }}
            description="ChromaDB document clusters"
            badge="RAG"
          />
        ) : (
          <MetricCard
            title="Citations Generated"
            value="42"
            icon={BookOpen}
            trend={{ value: '+8 recent', isPositive: true }}
            description="BibTeX & APA 7th Edition"
          />
        )}
      </div>

      {/* 3. Main Dashboard Body: 2/3 Table + 1/3 Quick Actions Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentDocumentsTable
            documents={documents}
            onViewReport={handleViewReport}
            onDeleteDocument={handleDeleteDocument}
            onUploadClick={handleUpload}
          />
        </div>

        <div className="lg:col-span-1">
          <QuickActions
            onUploadClick={handleUpload}
            tokensRemaining={metrics.tokensRemaining ?? 48500}
            totalTokens={100000}
          />
        </div>
      </div>
    </div>
  );
};

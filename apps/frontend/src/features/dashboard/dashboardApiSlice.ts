import { baseApi } from '../api/baseApi';

export type DocumentStatus = 'CLEAN' | 'FLAGGED' | 'PROCESSING' | 'PENDING';

export interface RecentDocument {
  id: string;
  title: string;
  status: DocumentStatus;
  date: string;
  fileSize?: string;
  similarityScore?: number;
}

export interface DashboardMetrics {
  documentsScanned: number;
  averagePlagiarism: number;
  tokensRemaining: number;
  totalUsers?: number;
  systemHealth?: string;
}

export interface DashboardSummaryResponse {
  metrics: DashboardMetrics;
  recentDocuments: RecentDocument[];
}

export const MOCK_DASHBOARD_DATA: DashboardSummaryResponse = {
  metrics: {
    documentsScanned: 18,
    averagePlagiarism: 3.4,
    tokensRemaining: 48500,
    totalUsers: 1420,
    systemHealth: '99.98%',
  },
  recentDocuments: [
    {
      id: 'doc-1',
      title: 'Quantum_Entanglement_Cryptography_Thesis.pdf',
      status: 'CLEAN',
      date: '2026-10-24',
      fileSize: '4.8 MB',
      similarityScore: 2.1,
    },
    {
      id: 'doc-2',
      title: 'Neural_Symbolic_Reasoning_Survey.docx',
      status: 'FLAGGED',
      date: '2026-10-23',
      fileSize: '1.9 MB',
      similarityScore: 24.5,
    },
    {
      id: 'doc-3',
      title: 'Distributed_Consensus_Protocols_Draft.pdf',
      status: 'CLEAN',
      date: '2026-10-22',
      fileSize: '3.2 MB',
      similarityScore: 4.8,
    },
    {
      id: 'doc-4',
      title: 'Biomedical_Genomics_RAG_Pipeline.pdf',
      status: 'PROCESSING',
      date: '2026-10-21',
      fileSize: '8.4 MB',
    },
    {
      id: 'doc-5',
      title: 'Computational_Linguistics_Corpus_Analysis.docx',
      status: 'CLEAN',
      date: '2026-10-20',
      fileSize: '2.7 MB',
      similarityScore: 1.2,
    },
  ],
};

export const dashboardApiSlice = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<DashboardSummaryResponse, void>({
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        try {
          const result = await fetchWithBQ('/analytics/dashboard-summary');
          if (result.data) {
            return { data: result.data as DashboardSummaryResponse };
          }
          return { data: MOCK_DASHBOARD_DATA };
        } catch {
          return { data: MOCK_DASHBOARD_DATA };
        }
      },
      providesTags: ['Analytics'],
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApiSlice;

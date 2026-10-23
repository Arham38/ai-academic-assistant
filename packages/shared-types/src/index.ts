/**
 * Shared Type Definitions for AI Academic Assistant
 * Synchronized across Node.js BFF Gateway and React Frontend.
 */

// User and Tenant Roles
export type UserRole = 'STUDENT' | 'RESEARCHER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface UserDTO {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  quotas: {
    monthlyScanLimit: number;
    scansConsumedThisMonth: number;
    maxPagesPerDocument: number;
  };
}

// Document Processing Lifecycle
export type DocumentProcessingStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ProcessingStage =
  'EXTRACTION' | 'CHUNKING' | 'EMBEDDING' | 'AGENTIC_EVALUATION' | 'SYNTHESIS';

export interface DocumentDTO {
  id: string;
  tenantId: string;
  userId: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  pageCount: number;
  status: DocumentProcessingStatus;
  processingStage?: ProcessingStage;
  reportId?: string;
  createdAt: string;
  updatedAt: string;
}

// Plagiarism Findings
export interface PlagiarismMatchDTO {
  sourceTitle: string;
  sourceUrl?: string;
  similarityScore: number;
  matchedChunkText: string;
  sourceExcerptText: string;
  pageNumber: number;
  charOffsetStart: number;
  charOffsetEnd: number;
}

// Grammar & Style Findings
export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'SUGGESTION';
export type GrammarCategory = 'PASSIVE_VOICE' | 'INFORMAL_TONE' | 'SYNTAX' | 'REDUNDANCY';

export interface GrammarIssueDTO {
  issueId: string;
  severity: IssueSeverity;
  category: GrammarCategory;
  originalSnippet: string;
  suggestedFix: string;
  explanation: string;
  pageNumber: number;
  charOffsetStart: number;
  charOffsetEnd: number;
}

// Citation Integrity Findings
export type CitationStyle = 'APA_7' | 'MLA_9' | 'CHICAGO_17' | 'IEEE' | 'UNKNOWN';

export interface CitationAnalysisDTO {
  detectedStyle: CitationStyle;
  totalCitationsFound: number;
  orphanedInTextCitations: string[];
  unreferencedBibliographyEntries: string[];
  verifiedDois: Array<{
    citationText: string;
    doi: string;
    isResolvedOnline: boolean;
  }>;
}

// Holistic Analysis Report
export interface AnalysisReportDTO {
  reportId: string;
  tenantId: string;
  documentId: string;
  summary: {
    overallIntegrityScore: number;
    plagiarismPercentage: number;
    grammarErrorCount: number;
    citationIssueCount: number;
    executiveSummary: string;
  };
  plagiarismAnalysis: {
    evaluatedChunksCount: number;
    matchedSources: PlagiarismMatchDTO[];
  };
  grammarAnalysis: {
    overallReadabilityScore: number;
    issues: GrammarIssueDTO[];
  };
  citationAnalysis: CitationAnalysisDTO;
  generatedAt: string;
}

// Real-Time Job Progress SSE Payload
export interface JobProgressEvent {
  jobId: string;
  documentId: string;
  stage: ProcessingStage;
  percentage: number;
  message: string;
  reportId?: string;
}

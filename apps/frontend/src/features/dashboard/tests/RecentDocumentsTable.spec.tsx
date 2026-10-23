/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentDocumentsTable, RecentDocumentItem } from '../components/RecentDocumentsTable';

const mockDocuments: RecentDocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Clean_Thesis.pdf',
    status: 'CLEAN',
    date: '2026-10-24',
    similarityScore: 2.5,
  },
  {
    id: 'doc-2',
    title: 'Flagged_Essay.docx',
    status: 'FLAGGED',
    date: '2026-10-23',
    similarityScore: 31.8,
  },
  {
    id: 'doc-3',
    title: 'Processing_Draft.pdf',
    status: 'PROCESSING',
    date: '2026-10-22',
  },
];

describe('<RecentDocumentsTable /> Component', () => {
  it('should render structured table with headers, documents, and status badges', () => {
    render(<RecentDocumentsTable documents={mockDocuments} />);

    // Headers
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('Upload Date')).toBeInTheDocument();
    expect(screen.getByText('Similarity')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Document Titles
    expect(screen.getByText('Clean_Thesis.pdf')).toBeInTheDocument();
    expect(screen.getByText('Flagged_Essay.docx')).toBeInTheDocument();
    expect(screen.getByText('Processing_Draft.pdf')).toBeInTheDocument();

    // Semantic Badges
    expect(screen.getByText('Clean')).toBeInTheDocument();
    expect(screen.getByText('Flagged')).toBeInTheDocument();
    expect(screen.getByText('Scanning...')).toBeInTheDocument();
  });

  it('should render friendly EmptyState when no documents are provided', () => {
    const mockUploadClick = vi.fn();
    render(<RecentDocumentsTable documents={[]} onUploadClick={mockUploadClick} />);

    // Empty state text
    expect(screen.getByText('No documents uploaded yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Upload your first research paper, thesis draft, or course assignment/i),
    ).toBeInTheDocument();

    // Primary action button
    const uploadBtn = screen.getByRole('button', { name: /upload your first document/i });
    expect(uploadBtn).toBeInTheDocument();

    fireEvent.click(uploadBtn);
    expect(mockUploadClick).toHaveBeenCalledTimes(1);

    // Table headers should not be present
    expect(screen.queryByText('Similarity')).not.toBeInTheDocument();
  });

  it('should toggle action menu and trigger onViewReport callback', () => {
    const mockViewReport = vi.fn();
    render(<RecentDocumentsTable documents={mockDocuments} onViewReport={mockViewReport} />);

    const actionButton = screen.getByRole('button', { name: /actions for clean_thesis\.pdf/i });
    fireEvent.click(actionButton);

    const viewReportBtn = screen.getByText('View Integrity Report');
    expect(viewReportBtn).toBeInTheDocument();

    fireEvent.click(viewReportBtn);
    expect(mockViewReport).toHaveBeenCalledWith('doc-1');
  });
});

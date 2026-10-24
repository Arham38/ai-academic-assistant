import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionHistoryTimeline, DocumentVersionItem } from '../VersionHistoryTimeline';

describe('<VersionHistoryTimeline /> Component', () => {
  const mockVersions: DocumentVersionItem[] = [
    {
      versionId: 'ver-1',
      versionNumber: 1,
      originalFilename: 'initial-draft.pdf',
      storageUri: '/uploads/ver-1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 500, // 500 KB
      status: 'COMPLETED',
      metadata: { wordCount: 3200, pageCount: 8 },
      uploadedAt: '2026-01-10T10:00:00.000Z',
    },
    {
      versionId: 'ver-2',
      versionNumber: 2,
      originalFilename: 'revised-draft.pdf',
      storageUri: '/uploads/ver-2.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 1024 * 2.5, // 2.5 MB
      status: 'EMBEDDING',
      metadata: { wordCount: 4500, pageCount: 11 },
      uploadedAt: '2026-01-15T12:00:00.000Z',
    },
  ];

  const mockOnSelectVersion = vi.fn();
  const mockOnRestoreVersion = vi.fn();
  const mockOnUploadNewVersion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state message when versions array is empty', () => {
    render(<VersionHistoryTimeline versions={[]} activeVersionId="" />);

    expect(screen.getByText(/no version history recorded yet/i)).toBeInTheDocument();
  });

  it('should render versions in descending order and display metadata', () => {
    render(
      <VersionHistoryTimeline
        versions={mockVersions}
        activeVersionId="ver-2"
        onSelectVersion={mockOnSelectVersion}
        onRestoreVersion={mockOnRestoreVersion}
        onUploadNewVersion={mockOnUploadNewVersion}
      />,
    );

    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('initial-draft.pdf')).toBeInTheDocument();
    expect(screen.getByText('revised-draft.pdf')).toBeInTheDocument();
    expect(screen.getByText(/4,500 words/i)).toBeInTheDocument();
    expect(screen.getByText(/3,200 words/i)).toBeInTheDocument();
  });

  it('should display Active badge strictly on the active version', () => {
    render(<VersionHistoryTimeline versions={mockVersions} activeVersionId="ver-2" />);

    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges).toHaveLength(1);
  });

  it('should trigger onSelectVersion when View Details is clicked', () => {
    render(
      <VersionHistoryTimeline
        versions={mockVersions}
        activeVersionId="ver-2"
        onSelectVersion={mockOnSelectVersion}
      />,
    );

    const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockOnSelectVersion).toHaveBeenCalledWith(mockVersions[1]); // Version 2 is top
  });

  it('should show Restore button only for inactive version and trigger callback', () => {
    render(
      <VersionHistoryTimeline
        versions={mockVersions}
        activeVersionId="ver-2"
        onRestoreVersion={mockOnRestoreVersion}
      />,
    );

    // Only Version 1 should have Restore button
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    expect(restoreButtons).toHaveLength(1);

    fireEvent.click(restoreButtons[0]);
    expect(mockOnRestoreVersion).toHaveBeenCalledWith('ver-1');
  });

  it('should trigger onUploadNewVersion when header button is clicked', () => {
    render(
      <VersionHistoryTimeline
        versions={mockVersions}
        activeVersionId="ver-2"
        onUploadNewVersion={mockOnUploadNewVersion}
      />,
    );

    const uploadButton = screen.getByRole('button', { name: /upload new version/i });
    fireEvent.click(uploadButton);

    expect(mockOnUploadNewVersion).toHaveBeenCalledTimes(1);
  });
});

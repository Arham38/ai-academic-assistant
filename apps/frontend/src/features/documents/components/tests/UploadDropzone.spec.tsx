import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadDropzone } from '../UploadDropzone';

describe('<UploadDropzone /> Component', () => {
  const mockOnFileSelected = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dropzone with instructional text and format limit badges', () => {
    render(<UploadDropzone onFileSelected={mockOnFileSelected} onError={mockOnError} />);

    expect(screen.getByText(/drag and drop your manuscript here/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf, docx, txt/i)).toBeInTheDocument();
    expect(screen.getByText(/max 10 mb/i)).toBeInTheDocument();
  });

  it('should accept a valid PDF file and trigger onFileSelected', async () => {
    render(<UploadDropzone onFileSelected={mockOnFileSelected} onError={mockOnError} />);

    const file = new File(['%PDF-1.4 sample content'], 'dissertation.pdf', {
      type: 'application/pdf',
    });

    const input = screen.getByLabelText(/upload document/i).querySelector('input')!;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnFileSelected).toHaveBeenCalledWith(file);
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  it('should reject a file exceeding 10MB limit and trigger onError', async () => {
    render(<UploadDropzone onFileSelected={mockOnFileSelected} onError={mockOnError} />);

    // 12MB file
    const oversizedFile = new File([new ArrayBuffer(12 * 1024 * 1024)], 'giant-thesis.pdf', {
      type: 'application/pdf',
    });

    const input = screen.getByLabelText(/upload document/i).querySelector('input')!;
    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringMatching(/file size exceeds the 10mb limit/i),
      );
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  it('should reject an unsupported file type (.exe) and trigger onError', async () => {
    render(<UploadDropzone onFileSelected={mockOnFileSelected} onError={mockOnError} />);

    const invalidFile = new File(['malicious'], 'script.exe', {
      type: 'application/x-msdownload',
    });

    const input = screen.getByLabelText(/upload document/i).querySelector('input')!;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.stringMatching(/unsupported file format/i));
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <UploadDropzone onFileSelected={mockOnFileSelected} onError={mockOnError} disabled={true} />,
    );

    const dropzone = screen.getByLabelText(/upload document/i);
    expect(dropzone).toHaveAttribute('aria-disabled', 'true');
    expect(dropzone).toHaveAttribute('tabindex', '-1');

    const input = dropzone.querySelector('input')!;
    expect(input).toBeDisabled();
  });
});

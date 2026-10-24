import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadProgress } from '../UploadProgress';

describe('<UploadProgress /> Component', () => {
  const mockFile = new File(['%PDF sample'], 'quantum-computing.pdf', {
    type: 'application/pdf',
  });
  // Mock file size to 2.5MB
  Object.defineProperty(mockFile, 'size', { value: 2.5 * 1024 * 1024 });

  it('should render file name, formatted size, and active upload percentage', () => {
    render(<UploadProgress file={mockFile} progress={65} status="uploading" onCancel={vi.fn()} />);

    expect(screen.getByText('quantum-computing.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.50 MB')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText(/uploading manuscript/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '65');
  });

  it('should call onCancel callback when user clicks Cancel during upload', () => {
    const handleCancel = vi.fn();

    render(
      <UploadProgress file={mockFile} progress={30} status="uploading" onCancel={handleCancel} />,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel upload/i });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should render error message and trigger onRetry when upload fails', () => {
    const handleRetry = vi.fn();

    render(
      <UploadProgress
        file={mockFile}
        progress={0}
        status="error"
        errorMessage="Network timed out. Gateway did not respond."
        onRetry={handleRetry}
      />,
    );

    expect(screen.getByText('Network timed out. Gateway did not respond.')).toBeInTheDocument();
    expect(screen.getByText(/upload failed/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry upload/i });
    fireEvent.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('should display processing state when transmission is complete and backend is indexing', () => {
    render(<UploadProgress file={mockFile} progress={100} status="processing" />);

    expect(screen.getByText(/finalizing document record/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render success message when upload completes', () => {
    render(<UploadProgress file={mockFile} progress={100} status="success" />);

    expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
    expect(screen.getByText(/navigating to document workspace/i)).toBeInTheDocument();
  });
});

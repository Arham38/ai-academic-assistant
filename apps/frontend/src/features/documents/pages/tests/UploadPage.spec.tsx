import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../../auth/authSlice';
import { baseApi } from '../../../api/baseApi';
import { UploadPage } from '../UploadPage';
import * as documentApiSliceModule from '../../documentApiSlice';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: {
      auth: {
        user: { id: 'usr_test', email: 'test@mit.edu', role: 'STUDENT' },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });
};

type MutationHookResult = ReturnType<typeof documentApiSliceModule.useUploadDocumentMutation>;

describe('<UploadPage /> Integration Suite', () => {
  let mockUploadDocument: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadDocument = vi.fn();
    vi.spyOn(documentApiSliceModule, 'useUploadDocumentMutation').mockReturnValue([
      mockUploadDocument as unknown as MutationHookResult[0],
      { isLoading: false, reset: vi.fn() } as unknown as MutationHookResult[1],
    ]);
  });

  it('should render the idle upload page with title and dropzone', () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UploadPage />
        </MemoryRouter>
      </Provider>,
    );

    expect(
      screen.getByRole('heading', { name: /upload academic manuscript/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/drag and drop your manuscript here/i)).toBeInTheDocument();
  });

  it('should trigger upload mutation and redirect upon successful ingestion', async () => {
    const store = createTestStore();
    const mockFile = new File(['%PDF thesis content'], 'thesis.pdf', {
      type: 'application/pdf',
    });

    mockUploadDocument.mockImplementation(async ({ onProgress }) => {
      onProgress(50);
      onProgress(100);
      return {
        data: {
          status: 'success',
          data: {
            document: {
              id: 'doc_uploaded_999',
              title: 'thesis.pdf',
            },
          },
        },
      };
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UploadPage />
        </MemoryRouter>
      </Provider>,
    );

    const input = screen.getByLabelText(/upload document/i).querySelector('input')!;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockUploadDocument).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/documents/doc_uploaded_999/overview');
      },
      { timeout: 2000 },
    );
  });

  it('should abort upload and return to idle state when cancel is clicked', async () => {
    const store = createTestStore();
    const mockFile = new File(['%PDF sample'], 'draft.pdf', {
      type: 'application/pdf',
    });

    let capturedSignal: AbortSignal | undefined;
    mockUploadDocument.mockImplementation(async ({ signal, onProgress }) => {
      capturedSignal = signal;
      onProgress(40);
      return new Promise(() => {}); // Keep in-flight
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UploadPage />
        </MemoryRouter>
      </Provider>,
    );

    const input = screen.getByLabelText(/upload document/i).querySelector('input')!;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/uploading manuscript/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel upload/i });
    fireEvent.click(cancelButton);

    expect(capturedSignal?.aborted).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/drag and drop your manuscript here/i)).toBeInTheDocument();
    });
  });

  it('should render error message and retry when upload fails', async () => {
    const store = createTestStore();
    const mockFile = new File(['%PDF sample'], 'error-doc.pdf', {
      type: 'application/pdf',
    });

    mockUploadDocument
      .mockResolvedValueOnce({
        error: {
          status: 400,
          data: {
            detail: 'Document entity validation failed: invalid format.',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            document: { id: 'doc_retried_123' },
          },
        },
      });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UploadPage />
        </MemoryRouter>
      </Provider>,
    );

    const input = screen.getByLabelText(/upload document/i).querySelector('input')!;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/document entity validation failed: invalid format/i),
      ).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry upload/i });
    fireEvent.click(retryButton);

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/documents/doc_retried_123/overview');
      },
      { timeout: 2000 },
    );
  });
});

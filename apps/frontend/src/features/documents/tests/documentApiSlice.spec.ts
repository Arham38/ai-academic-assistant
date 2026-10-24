import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { type AxiosProgressEvent } from 'axios';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import { documentApiSlice, type UploadDocumentError } from '../documentApiSlice';

vi.mock('axios');

const createTestStore = (token?: string) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: {
      auth: {
        user: { id: 'usr_1', email: 'test@mit.edu', role: 'STUDENT' },
        token: token || 'test.jwt.token',
        isAuthenticated: !!token,
      },
    },
  });
};

describe('documentApiSlice RTK Query with Axios Progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should post multipart/form-data with auth header and report upload progress', async () => {
    const store = createTestStore('bearer.token.123');
    const mockFile = new File(['%PDF content'], 'essay.pdf', { type: 'application/pdf' });
    const progressSpy = vi.fn();

    vi.mocked(axios.post).mockImplementationOnce(async (_url, _data, config) => {
      // Simulate Axios streaming onUploadProgress
      if (config?.onUploadProgress) {
        config.onUploadProgress({
          loaded: 50,
          total: 100,
          bytes: 50,
          lengthComputable: true,
        } as unknown as AxiosProgressEvent);
        config.onUploadProgress({
          loaded: 100,
          total: 100,
          bytes: 100,
          lengthComputable: true,
        } as unknown as AxiosProgressEvent);
      }
      return {
        data: {
          status: 'success',
          data: {
            document: {
              id: 'doc_12345',
              userId: 'usr_1',
              title: 'My Course Essay',
              originalFilename: 'essay.pdf',
              storageUri: '/uploads/uuid-12345.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 12,
              status: 'PENDING',
              createdAt: '2026-10-24T12:00:00Z',
            },
          },
        },
      };
    });

    const result = await store.dispatch(
      documentApiSlice.endpoints.uploadDocument.initiate({
        file: mockFile,
        title: 'My Course Essay',
        onProgress: progressSpy,
      }),
    );

    expect(result.data?.status).toBe('success');
    expect(result.data?.data.document.id).toBe('doc_12345');
    expect(progressSpy).toHaveBeenCalledWith(50);
    expect(progressSpy).toHaveBeenCalledWith(100);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/documents'),
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer.token.123',
        }),
        withCredentials: true,
      }),
    );
  });

  it('should handle cancellation via AbortSignal gracefully', async () => {
    const store = createTestStore();
    const mockFile = new File(['%PDF content'], 'canceled.pdf', { type: 'application/pdf' });
    const controller = new AbortController();

    const canceledError = new Error('canceled');
    canceledError.name = 'CanceledError';
    vi.mocked(axios.post).mockRejectedValueOnce(canceledError);

    const result = await store.dispatch(
      documentApiSlice.endpoints.uploadDocument.initiate({
        file: mockFile,
        signal: controller.signal,
      }),
    );

    expect(result.error).toBeDefined();
    const errorPayload = result.error as unknown as UploadDocumentError;
    expect(errorPayload.status).toBe('CUSTOM_ERROR');
    expect(errorPayload.data.detail).toContain('aborted by user');
  });

  it('should return error response when server rejects upload with 413 or 400', async () => {
    const store = createTestStore();
    const mockFile = new File(['oversized content'], 'huge.pdf', { type: 'application/pdf' });

    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 413,
        data: {
          title: 'Payload Too Large',
          detail: 'File size exceeds maximum allowed limit of 10MB.',
        },
      },
    });

    const result = await store.dispatch(
      documentApiSlice.endpoints.uploadDocument.initiate({
        file: mockFile,
      }),
    );

    expect(result.error).toBeDefined();
    const errorPayload = result.error as unknown as UploadDocumentError;
    expect(errorPayload.status).toBe(413);
    expect(errorPayload.data.detail).toContain('File size exceeds');
  });
});

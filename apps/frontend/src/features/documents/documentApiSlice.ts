import axios, { AxiosProgressEvent, isCancel } from 'axios';
import { baseApi } from '../api/baseApi';
import type { RootState } from '../../app/rootReducer';

export interface DocumentEntity {
  id: string;
  userId: string;
  title: string;
  originalFilename: string;
  storageUri: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadDocumentPayload {
  file: File;
  title?: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface UploadDocumentResponse {
  status: string;
  data: {
    document: DocumentEntity;
  };
}

export interface UploadDocumentError {
  status: number | 'CUSTOM_ERROR';
  data: {
    detail?: string;
    message?: string;
    [key: string]: unknown;
  };
}

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
};

/**
 * RTK Query document slice featuring custom Axios mutation queryFn.
 * Overrides fetchBaseQuery to enable real-time onUploadProgress streaming
 * and in-flight request cancellation via AbortSignal.
 */
export const documentApiSlice = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadDocument: builder.mutation<UploadDocumentResponse, UploadDocumentPayload>({
      async queryFn(arg, { getState }) {
        const formData = new FormData();
        formData.append('file', arg.file);
        if (arg.title) {
          formData.append('title', arg.title);
        }

        const state = getState() as RootState;
        const token = state.auth?.token;

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        try {
          const response = await axios.post<UploadDocumentResponse>(
            `${getApiBaseUrl()}/documents`,
            formData,
            {
              headers,
              withCredentials: true,
              signal: arg.signal,
              onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                if (progressEvent.total) {
                  const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total,
                  );
                  arg.onProgress?.(percentCompleted);
                }
              },
            },
          );

          return { data: response.data };
        } catch (axiosError: unknown) {
          if (isCancel(axiosError) || (axiosError as Error)?.name === 'CanceledError') {
            return {
              error: {
                status: 'CUSTOM_ERROR',
                data: { detail: 'Upload was aborted by user.' },
              },
            };
          }

          if (axios.isAxiosError(axiosError)) {
            return {
              error: {
                status: axiosError.response?.status || 500,
                data: axiosError.response?.data || { detail: axiosError.message },
              },
            };
          }

          return {
            error: {
              status: 500,
              data: {
                detail: (axiosError as Error)?.message || 'An unexpected upload error occurred.',
              },
            },
          };
        }
      },
      invalidatesTags: ['Document'],
    }),
  }),
});

export const { useUploadDocumentMutation } = documentApiSlice;

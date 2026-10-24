import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastAPIAIServiceClient } from '../../src/infrastructure/external-clients/FastAPIAIServiceClient';

describe('FastAPIAIServiceClient Unit Tests', () => {
  let client: FastAPIAIServiceClient;
  const mockBaseUrl = 'http://mock-fastapi:8000';
  const mockSecret = 'test-internal-secret-token';

  beforeEach(() => {
    client = new FastAPIAIServiceClient(mockBaseUrl, mockSecret);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully dispatch document processing request via fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ status: 'success', message: 'Document processing initiated.' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.triggerDocumentProcessing('doc-12345', '/uploads/test.pdf');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://mock-fastapi:8000/api/internal/v1/process/document',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': 'test-internal-secret-token',
        },
        body: JSON.stringify({
          documentId: 'doc-12345',
          storageUri: '/uploads/test.pdf',
        }),
      },
    );
  });

  it('should handle non-2xx HTTP responses gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      client.triggerDocumentProcessing('doc-fail-500', '/uploads/error.pdf'),
    ).resolves.not.toThrow();
  });

  it('should handle network connection errors gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      client.triggerDocumentProcessing('doc-fail-network', '/uploads/down.pdf'),
    ).resolves.not.toThrow();
  });
});

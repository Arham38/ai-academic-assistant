import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseQueryApi } from '@reduxjs/toolkit/query';
import { createBaseQueryWithReauth } from '../baseQueryWithReauth';

describe('baseQueryWithReauth interceptor', () => {
  let mockApi: BaseQueryApi;
  let mockState: {
    auth: {
      token: string | null;
      user: { id: string; email: string; role: string } | null;
      isAuthenticated: boolean;
    };
  };
  let mockCustomBaseQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockState = {
      auth: {
        token: 'initial-access-token',
        user: { id: 'usr_1', email: 'test@mit.edu', role: 'STUDENT' },
        isAuthenticated: true,
      },
    };

    mockApi = {
      getState: vi.fn(() => mockState) as unknown as BaseQueryApi['getState'],
      dispatch: vi.fn() as unknown as BaseQueryApi['dispatch'],
      signal: new AbortController().signal,
      abort: vi.fn(),
      extra: undefined,
      endpoint: 'testEndpoint',
      type: 'query',
    };

    mockCustomBaseQuery = vi.fn();
  });

  it('should execute primary request and return result when successful', async () => {
    mockCustomBaseQuery.mockResolvedValueOnce({
      data: { status: 'success', data: { message: 'hello' } },
    });

    const baseQuery = createBaseQueryWithReauth(mockCustomBaseQuery);
    const result = await baseQuery('/documents', mockApi, {});

    expect(mockCustomBaseQuery).toHaveBeenCalledWith('/documents', mockApi, {});
    expect(result.data).toEqual({ status: 'success', data: { message: 'hello' } });
    expect(mockApi.dispatch).not.toHaveBeenCalled();
  });

  it('should intercept 401, perform silent refresh, update credentials, and retry original request', async () => {
    mockCustomBaseQuery
      // 1. Initial request fails with 401
      .mockResolvedValueOnce({
        error: { status: 401, data: { detail: 'Token expired' } },
      })
      // 2. Refresh request succeeds with new token
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            accessToken: 'brand-new-access-token',
            user: { id: 'usr_1', email: 'test@mit.edu', role: 'STUDENT' },
          },
        },
      })
      // 3. Retried original request succeeds
      .mockResolvedValueOnce({
        data: { status: 'success', data: { message: 'recovered data' } },
      });

    const baseQuery = createBaseQueryWithReauth(mockCustomBaseQuery);
    const result = await baseQuery('/documents', mockApi, {});

    expect(mockCustomBaseQuery).toHaveBeenCalledTimes(3);
    // Refresh endpoint was hit
    expect(mockCustomBaseQuery).toHaveBeenNthCalledWith(
      2,
      { url: '/auth/refresh', method: 'POST' },
      mockApi,
      {},
    );
    // Credentials updated in Redux
    expect(mockApi.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth/setCredentials',
        payload: {
          token: 'brand-new-access-token',
          user: { id: 'usr_1', email: 'test@mit.edu', role: 'STUDENT' },
        },
      }),
    );
    // Retried request returned data
    expect(result.data).toEqual({ status: 'success', data: { message: 'recovered data' } });
  });

  it('should dispatch logOut if silent refresh fails', async () => {
    mockCustomBaseQuery
      // 1. Initial request returns 401
      .mockResolvedValueOnce({
        error: { status: 401, data: { detail: 'Token expired' } },
      })
      // 2. Refresh request also fails (cookie expired / revoked)
      .mockResolvedValueOnce({
        error: { status: 401, data: { detail: 'Invalid refresh token' } },
      });

    const baseQuery = createBaseQueryWithReauth(mockCustomBaseQuery);
    const result = await baseQuery('/documents', mockApi, {});

    expect(mockCustomBaseQuery).toHaveBeenCalledTimes(2);
    expect(mockApi.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth/logOut',
      }),
    );
    expect(result.error).toEqual({ status: 401, data: { detail: 'Token expired' } });
  });

  it('should NOT trigger refresh when 401 originates directly from an auth endpoint', async () => {
    mockCustomBaseQuery.mockResolvedValueOnce({
      error: { status: 401, data: { detail: 'Invalid credentials' } },
    });

    const baseQuery = createBaseQueryWithReauth(mockCustomBaseQuery);
    const result = await baseQuery({ url: '/auth/login', method: 'POST' }, mockApi, {});

    expect(mockCustomBaseQuery).toHaveBeenCalledTimes(1);
    expect(result.error).toBeDefined();
    // No dispatch of setCredentials or logout
    expect(mockApi.dispatch).not.toHaveBeenCalled();
  });
});

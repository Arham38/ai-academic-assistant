import {
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { setCredentials, logOut } from '../auth/authSlice';
import type { RootState } from '../../app/rootReducer';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Factory for baseQueryWithReauth supporting dependency injection for testing.
 * Automatically intercepts 401 Unauthorized responses, acquires a fresh access token
 * via the HttpOnly refreshToken cookie, and retries the original request.
 */
export const createBaseQueryWithReauth = (
  customBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = rawBaseQuery,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  // In-flight refresh promise to deduplicate concurrent 401s and prevent token family collisions
  let refreshPromise: Promise<string | null> | null = null;

  return async (args, api, extraOptions) => {
    // Execute primary request
    let result = await customBaseQuery(args, api, extraOptions);

    // Check if request resulted in 401 Unauthorized
    if (result.error && result.error.status === 401) {
      const url = typeof args === 'string' ? args : args.url;

      // Do not attempt refresh on auth endpoints to prevent infinite loops
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout');

      if (!isAuthEndpoint) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const refreshResult = await customBaseQuery(
                { url: '/auth/refresh', method: 'POST' },
                api,
                extraOptions,
              );

              if (refreshResult.data) {
                const resData = refreshResult.data as {
                  status: string;
                  data: {
                    accessToken: string;
                    user?: {
                      id: string;
                      email: string;
                      role: string;
                      firstName?: string;
                      lastName?: string;
                    };
                  };
                };
                const newToken = resData.data.accessToken;
                api.dispatch(
                  setCredentials({
                    token: newToken,
                    user: resData.data.user ?? null,
                  }),
                );
                return newToken;
              } else {
                api.dispatch(logOut());
                return null;
              }
            } catch {
              api.dispatch(logOut());
              return null;
            } finally {
              refreshPromise = null;
            }
          })();
        }

        const newToken = await refreshPromise;

        if (newToken) {
          // Retry the original query with the newly acquired access token
          result = await customBaseQuery(args, api, extraOptions);
        }
      }
    }

    return result;
  };
};

// Default singleton instance for application runtime
export const baseQueryWithReauth = createBaseQueryWithReauth();

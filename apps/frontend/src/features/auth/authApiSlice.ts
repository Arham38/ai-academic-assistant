import { baseApi } from '../api/baseApi';
import { setCredentials, logOut, setUser, AuthUser } from './authSlice';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  institutionId?: string;
}

export interface AuthResponse {
  status: 'success';
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

export interface RegisterResponse {
  status: 'success';
  data: {
    user: AuthUser;
  };
}

export interface RefreshResponse {
  status: 'success';
  data: {
    accessToken: string;
    user?: AuthUser;
  };
}

export interface UserProfileResponse {
  status: 'success';
  data: {
    user: AuthUser;
  };
}

export interface LogoutResponse {
  status: 'success';
  message: string;
}

export const authApiSlice = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data) {
            dispatch(
              setCredentials({
                token: data.data.accessToken,
                user: data.data.user,
              }),
            );
          }
        } catch {
          // Handled in component
        }
      },
    }),

    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    refresh: builder.mutation<RefreshResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data?.accessToken) {
            dispatch(
              setCredentials({
                token: data.data.accessToken,
                user: data.data.user ?? null,
              }),
            );
          }
        } catch {
          dispatch(logOut());
        }
      },
    }),

    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logOut());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    getCurrentUser: builder.query<UserProfileResponse, void>({
      query: () => ({
        url: '/users/me',
        method: 'GET',
      }),
      providesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data?.user) {
            dispatch(setUser(data.data.user));
          }
        } catch {
          // Handled by caller / unauthenticated
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
} = authApiSlice;

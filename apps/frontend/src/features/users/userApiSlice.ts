import { baseApi } from '../api/baseApi';
import { setUser, AuthUser } from '../auth/authSlice';

export interface UserProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface UserProfileResponse {
  status: 'success';
  data: {
    user: UserProfileData;
  };
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePasswordResponse {
  status: 'success';
  message: string;
}

export const userApiSlice = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<UserProfileResponse, void>({
      query: () => ({
        url: '/users/me',
        method: 'GET',
      }),
      providesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data?.user) {
            dispatch(setUser(data.data.user as AuthUser));
          }
        } catch {
          // Handled by component / query state
        }
      },
    }),

    updateProfile: builder.mutation<UserProfileResponse, UpdateProfileRequest>({
      query: (payload) => ({
        url: '/users/me',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data?.user) {
            // Synchronize Redux authSlice immediately so top-bar reflects updated names
            dispatch(setUser(data.data.user as AuthUser));
          }
        } catch {
          // Handled by form UI
        }
      },
    }),

    updatePassword: builder.mutation<UpdatePasswordResponse, UpdatePasswordRequest>({
      query: (payload) => ({
        url: '/users/me/password',
        method: 'PATCH',
        body: payload,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
} = userApiSlice;

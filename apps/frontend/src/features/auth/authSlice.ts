import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'RESEARCHER' | 'ADMIN' | string;
  firstName?: string;
  lastName?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user?: AuthUser | null; token: string }>) => {
      const { user, token } = action.payload;
      state.token = token;
      if (user) {
        state.user = user;
      }
      state.isAuthenticated = true;
    },
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setUser, logOut } = authSlice.actions;

export const authReducer = authSlice.reducer;

// RootState-independent slice selectors
export const selectCurrentUser = (state: { auth: AuthState }): AuthUser | null => state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }): string | null => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }): boolean =>
  state.auth.isAuthenticated || !!state.auth.token;
export const selectUserRole = (state: { auth: AuthState }): string | undefined =>
  state.auth.user?.role;

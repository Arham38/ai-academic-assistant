import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer, AuthState } from '../authSlice';
import { RequireAuth } from '../components/RequireAuth';
import { RequireRole } from '../components/RequireRole';
import { PublicOnly } from '../components/PublicOnly';

const createMockStore = (initialAuthState: AuthState) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: initialAuthState,
    },
  });
};

describe('Route Guard Wrappers', () => {
  describe('<RequireAuth />', () => {
    it('should redirect unauthenticated users to /login', () => {
      const store = createMockStore({
        user: null,
        token: null,
        isAuthenticated: false,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<div>Login Page Target</div>} />
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
      expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
    });

    it('should render child outlet when user is authenticated with token', () => {
      const store = createMockStore({
        user: { id: 'usr_1', email: 'scholar@mit.edu', role: 'STUDENT' },
        token: 'valid.access.token',
        isAuthenticated: true,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<div>Login Page Target</div>} />
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page Target')).not.toBeInTheDocument();
    });
  });

  describe('<RequireRole />', () => {
    it('should redirect user to /unauthorized when user does not have allowed role', () => {
      const store = createMockStore({
        user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
        token: 'valid.token',
        isAuthenticated: true,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/unauthorized" element={<div>Access Denied Page</div>} />
              <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<div>Admin Console Restricted</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Console Restricted')).not.toBeInTheDocument();
    });

    it('should permit access when user has matching role', () => {
      const store = createMockStore({
        user: { id: 'usr_admin', email: 'admin@mit.edu', role: 'ADMIN' },
        token: 'valid.token',
        isAuthenticated: true,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/unauthorized" element={<div>Access Denied Page</div>} />
              <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<div>Admin Console Restricted</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Admin Console Restricted')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
    });
  });

  describe('<PublicOnly />', () => {
    it('should allow unauthenticated users to access /login', () => {
      const store = createMockStore({
        user: null,
        token: null,
        isAuthenticated: false,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<div>Login Form Active</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Login Form Active')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
    });

    it('should redirect authenticated users from /login directly to /dashboard', () => {
      const store = createMockStore({
        user: { id: 'usr_1', email: 'scholar@mit.edu', role: 'STUDENT' },
        token: 'valid.token',
        isAuthenticated: true,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<div>Login Form Active</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(screen.queryByText('Login Form Active')).not.toBeInTheDocument();
    });
  });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../../features/auth/authSlice';
import { baseApi } from '../../../features/api/baseApi';
import { DashboardLayout } from '../DashboardLayout';

const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'usr_turing', email: 'alan@cambridge.ac.uk', role: 'ADMIN' },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });
};

describe('<DashboardLayout /> Shell Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render persistent sidebar, header, and active child view via Outlet', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard/student']}>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route
                path="/dashboard/student"
                element={
                  <div>
                    <h2>Student View Content</h2>
                    <Link to="/settings">Go to Settings</Link>
                  </div>
                }
              />
              <Route path="/settings" element={<div>Settings View Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    // Frame elements exist
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Initial child view rendered
    expect(screen.getByText('Student View Content')).toBeInTheDocument();

    // Navigate to /settings
    fireEvent.click(screen.getByText('Go to Settings'));

    // New child view rendered while layout frame remains mounted
    expect(screen.getByText('Settings View Content')).toBeInTheDocument();
    expect(screen.queryByText('Student View Content')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('should restore and persist collapsed state in localStorage', () => {
    localStorage.setItem('academic_assistant_sidebar_collapsed', 'true');
    const store = createMockStore();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard/student']}>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard/student" element={<div>Student Workspace</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    const expandButton = screen.getByRole('button', { name: /expand sidebar/i });
    expect(expandButton).toBeInTheDocument();

    // Toggle expand
    fireEvent.click(expandButton);
    expect(localStorage.getItem('academic_assistant_sidebar_collapsed')).toBe('false');
  });
});

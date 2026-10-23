/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../auth/authSlice';
import { baseApi } from '../../api/baseApi';
import { DashboardOverview } from '../DashboardOverview';

const createMockStore = (role = 'STUDENT') => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'usr_hypatia',
          email: 'hypatia@alexandria.edu',
          firstName: 'Hypatia',
          lastName: 'Alexandria',
          role,
        },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
};

describe('<DashboardOverview /> Feature Container', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton when isLoading is true', () => {
    const store = createMockStore('STUDENT');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <DashboardOverview isLoading={true} />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back, Hypatia/i)).not.toBeInTheDocument();
  });

  it('should render student-tailored metrics, recent documents table, and quick actions when loaded', () => {
    const store = createMockStore('STUDENT');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <DashboardOverview isLoading={false} />
        </MemoryRouter>
      </Provider>,
    );

    // Welcome greeting
    expect(screen.getByText(/Welcome back, Hypatia/i)).toBeInTheDocument();

    // Standard metrics
    expect(screen.getByText('Documents Scanned')).toBeInTheDocument();
    expect(screen.getByText('Avg Plagiarism')).toBeInTheDocument();

    // Student-specific metrics
    expect(screen.getByText('AI Tokens Left')).toBeInTheDocument();
    expect(screen.getByText('Citations Generated')).toBeInTheDocument();

    // Table
    expect(screen.getByText('Recent Documents')).toBeInTheDocument();

    // Quick Actions
    expect(screen.getByText('Quick Upload')).toBeInTheDocument();
    expect(screen.getByText('AI Compute Quota')).toBeInTheDocument();
  });

  it('should adapt metrics for ADMIN role showing Total Users and System Cluster', () => {
    const store = createMockStore('ADMIN');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <DashboardOverview isLoading={false} />
        </MemoryRouter>
      </Provider>,
    );

    // Admin metrics
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('System Cluster')).toBeInTheDocument();

    // Student-only metrics should not be rendered
    expect(screen.queryByText('AI Tokens Left')).not.toBeInTheDocument();
    expect(screen.queryByText('Citations Generated')).not.toBeInTheDocument();
  });
});

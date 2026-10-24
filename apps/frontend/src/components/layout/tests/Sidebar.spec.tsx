/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer, AuthState } from '../../../features/auth/authSlice';
import { Sidebar } from '../Sidebar';

const createMockStore = (authState: Partial<AuthState>) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'usr_test', email: 'test@mit.edu', role: 'STUDENT', ...authState.user },
        token: 'valid.token',
        isAuthenticated: true,
        ...authState,
      },
    },
  });
};

describe('<Sidebar /> Role-Aware Navigation', () => {
  const mockToggleCollapse = vi.fn();
  const mockItemClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Dashboard, My Documents, Student Hub, and Settings for a STUDENT user', () => {
    const store = createMockStore({
      user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    // Permitted links
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Documents')).toBeInTheDocument();
    expect(screen.getByText('Student Hub')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Restricted links
    expect(screen.queryByText('Researcher Hub')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should render Researcher Hub for a RESEARCHER user while hiding Admin Panel', () => {
    const store = createMockStore({
      user: { id: 'usr_researcher', email: 'researcher@mit.edu', role: 'RESEARCHER' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Documents')).toBeInTheDocument();
    expect(screen.getByText('Student Hub')).toBeInTheDocument();
    expect(screen.getByText('Researcher Hub')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should render ALL navigation links for an ADMIN user including Admin Panel', () => {
    const store = createMockStore({
      user: { id: 'usr_admin', email: 'admin@mit.edu', role: 'ADMIN' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Documents')).toBeInTheDocument();
    expect(screen.getByText('Student Hub')).toBeInTheDocument();
    expect(screen.getByText('Researcher Hub')).toBeInTheDocument();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should trigger onToggleCollapse when collapse button is clicked', () => {
    const store = createMockStore({
      user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseButton);

    expect(mockToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should trigger onItemClick when a navigation link is clicked', () => {
    const store = createMockStore({
      user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    const docLink = screen.getByText('My Documents');
    fireEvent.click(docLink);

    expect(mockItemClick).toHaveBeenCalledTimes(1);
  });

  it('should only highlight Student Hub (not Dashboard) when current location is /dashboard/student', () => {
    const store = createMockStore({
      user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard/student']}>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    const studentHubLink = screen.getByText('Student Hub').closest('a');
    const dashboardLink = screen.getByText('Dashboard').closest('a');

    expect(studentHubLink).toHaveClass('bg-indigo-50');
    expect(studentHubLink).toHaveClass('text-indigo-700');

    expect(dashboardLink).not.toHaveClass('bg-indigo-50');
    expect(dashboardLink).toHaveClass('text-slate-600');
  });

  it('should only highlight Dashboard when current location is /dashboard', () => {
    const store = createMockStore({
      user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={mockToggleCollapse}
            onItemClick={mockItemClick}
          />
        </MemoryRouter>
      </Provider>,
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const studentHubLink = screen.getByText('Student Hub').closest('a');

    expect(dashboardLink).toHaveClass('bg-indigo-50');
    expect(dashboardLink).toHaveClass('text-indigo-700');

    expect(studentHubLink).not.toHaveClass('bg-indigo-50');
    expect(studentHubLink).toHaveClass('text-slate-600');
  });
});

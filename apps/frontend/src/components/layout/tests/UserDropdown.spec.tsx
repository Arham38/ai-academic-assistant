/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../../features/auth/authSlice';
import { baseApi } from '../../../features/api/baseApi';
import { UserDropdown } from '../UserDropdown';

const mockLogout = vi.fn();

vi.mock('../../../features/auth/authApiSlice', async () => {
  const actual = await vi.importActual('../../../features/auth/authApiSlice');
  return {
    ...actual,
    useLogoutMutation: () => [mockLogout, { isLoading: false }],
  };
});

const createMockStore = (role = 'STUDENT') => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'usr_curie',
          email: 'marie.curie@sorbonne.fr',
          firstName: 'Marie',
          lastName: 'Curie',
          role,
        },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });
};

describe('<UserDropdown /> Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initials and user name in trigger button', () => {
    const store = createMockStore('RESEARCHER');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UserDropdown />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('MC')).toBeInTheDocument();
    expect(screen.getByText('Marie Curie')).toBeInTheDocument();
    expect(screen.getByText('marie.curie@sorbonne.fr')).toBeInTheDocument();
  });

  it('should toggle menu open on click and display role badge', () => {
    const store = createMockStore('ADMIN');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UserDropdown />
        </MemoryRouter>
      </Provider>,
    );

    const trigger = screen.getByRole('button', { name: /user profile menu/i });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Settings & Profile')).toBeInTheDocument();
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
  });

  it('should trigger logout when Sign Out is clicked', async () => {
    mockLogout.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ status: 'success' }),
    });

    const store = createMockStore('STUDENT');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UserDropdown />
        </MemoryRouter>
      </Provider>,
    );

    const trigger = screen.getByRole('button', { name: /user profile menu/i });
    fireEvent.click(trigger);

    const signOutBtn = screen.getByRole('menuitem', { name: /sign out/i });
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should close dropdown on Escape key', () => {
    const store = createMockStore('STUDENT');

    render(
      <Provider store={store}>
        <MemoryRouter>
          <UserDropdown />
        </MemoryRouter>
      </Provider>,
    );

    const trigger = screen.getByRole('button', { name: /user profile menu/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

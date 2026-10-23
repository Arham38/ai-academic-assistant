/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../../features/auth/authSlice';
import { baseApi } from '../../../features/api/baseApi';
import { Header } from '../Header';

const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'usr_curie',
          email: 'curie@sorbonne.fr',
          firstName: 'Marie',
          lastName: 'Curie',
          role: 'RESEARCHER',
        },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });
};

describe('<Header /> Component', () => {
  const mockToggleMobileMenu = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRoute = (initialPath: string) => {
    const store = createMockStore();
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Header onToggleMobileMenu={mockToggleMobileMenu} />
        </MemoryRouter>
      </Provider>,
    );
  };

  it('should render correct section and page title in breadcrumbs', () => {
    const { unmount: unmount1 } = renderWithRoute('/dashboard');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    unmount1();

    const { unmount: unmount2 } = renderWithRoute('/documents');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Documents');
    unmount2();

    const { unmount: unmount3 } = renderWithRoute('/dashboard/student');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Student Hub');
    unmount3();

    const { unmount: unmount4 } = renderWithRoute('/dashboard/research');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Researcher Hub');
    unmount4();

    const { unmount: unmount5 } = renderWithRoute('/admin');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Admin Panel');
    unmount5();

    const { unmount: unmount6 } = renderWithRoute('/settings');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    unmount6();
  });

  it('should trigger onToggleMobileMenu when mobile hamburger button is clicked', () => {
    renderWithRoute('/dashboard');

    const hamburgerButton = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(hamburgerButton);

    expect(mockToggleMobileMenu).toHaveBeenCalledTimes(1);
  });
});

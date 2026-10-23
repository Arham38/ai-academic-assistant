/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../../features/auth/authSlice';
import { MobileNav } from '../MobileNav';

const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'usr_student', email: 'student@mit.edu', role: 'STUDENT' },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });
};

describe('<MobileNav /> Sliding Drawer (Sheet)', () => {
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render anything when isOpen is false', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <MobileNav isOpen={false} onClose={mockClose} />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog, backdrop, and close button when isOpen is true', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <MobileNav isOpen={true} onClose={mockClose} />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByRole('dialog', { name: /mobile navigation menu/i })).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close navigation menu/i });
    fireEvent.click(closeButton);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should close drawer when backdrop overlay is clicked', () => {
    const store = createMockStore();

    const { container } = render(
      <Provider store={store}>
        <MemoryRouter>
          <MobileNav isOpen={true} onClose={mockClose} />
        </MemoryRouter>
      </Provider>,
    );

    const backdrop = container.querySelector('.backdrop-blur-xs');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should close drawer when Escape key is pressed', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <MobileNav isOpen={true} onClose={mockClose} />
        </MemoryRouter>
      </Provider>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

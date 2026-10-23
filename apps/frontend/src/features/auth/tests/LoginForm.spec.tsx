import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../authSlice';
import { baseApi } from '../../api/baseApi';
import { LoginForm } from '../components/LoginForm';

const mockLoginMutation = vi.fn();

vi.mock('../authApiSlice', async () => {
  const actual = await vi.importActual('../authApiSlice');
  return {
    ...actual,
    useLoginMutation: () => [mockLoginMutation, { isLoading: false }],
  };
});

const renderLoginForm = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </Provider>,
  );
};

describe('<LoginForm /> Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields and submit button', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/institutional email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to workspace/i })).toBeInTheDocument();
  });

  it('should display Zod validation errors when submitting empty form without calling API', async () => {
    renderLoginForm();

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockLoginMutation).not.toHaveBeenCalled();
  });

  it('should display validation error for invalid email syntax', async () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/institutional email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address format/i)).toBeInTheDocument();
    });

    expect(mockLoginMutation).not.toHaveBeenCalled();
  });

  it('should submit valid credentials and call login mutation', async () => {
    mockLoginMutation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          accessToken: 'new.jwt.token',
          user: { id: 'usr_1', email: 'scholar@mit.edu', role: 'STUDENT' },
        },
      }),
    });

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/institutional email/i), {
      target: { value: 'scholar@mit.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'ValidPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => {
      expect(mockLoginMutation).toHaveBeenCalledWith({
        email: 'scholar@mit.edu',
        password: 'ValidPassword123!',
      });
    });
  });

  it('should display inline alert when API rejects login with 401 Unauthorized', async () => {
    mockLoginMutation.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 401,
        data: { detail: 'Invalid email or password.' },
      }),
    });

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/institutional email/i), {
      target: { value: 'wrong@mit.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'WrongPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});

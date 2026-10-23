import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../authSlice';
import { baseApi } from '../../api/baseApi';
import { RegisterForm } from '../components/RegisterForm';

const mockRegisterMutation = vi.fn();

vi.mock('../authApiSlice', async () => {
  const actual = await vi.importActual('../authApiSlice');
  return {
    ...actual,
    useRegisterMutation: () => [mockRegisterMutation, { isLoading: false }],
  };
});

const renderRegisterForm = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    </Provider>,
  );
};

describe('<RegisterForm /> Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form input fields', () => {
    renderRegisterForm();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/institutional email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create scholar account/i })).toBeInTheDocument();
  });

  it('should display required validation errors on empty submission', async () => {
    renderRegisterForm();

    fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    expect(mockRegisterMutation).not.toHaveBeenCalled();
  });

  it('should reject password that does not fulfill complexity criteria (length, uppercase, number)', async () => {
    renderRegisterForm();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/institutional email/i), {
      target: { value: 'ada@cambridge.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });

    expect(mockRegisterMutation).not.toHaveBeenCalled();
  });

  it('should reject when confirm password does not match password', async () => {
    renderRegisterForm();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/institutional email/i), {
      target: { value: 'ada@cambridge.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'StrongPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'DifferentPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(mockRegisterMutation).not.toHaveBeenCalled();
  });

  it('should submit valid registration data and render success notification', async () => {
    mockRegisterMutation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          user: { id: 'usr_ada', email: 'ada@cambridge.edu', role: 'STUDENT' },
        },
      }),
    });

    renderRegisterForm();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/institutional email/i), {
      target: { value: 'ada@cambridge.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'EngineAnalytical1843!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'EngineAnalytical1843!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

    await waitFor(() => {
      expect(mockRegisterMutation).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@cambridge.edu',
        password: 'EngineAnalytical1843!',
        institutionId: undefined,
      });
      expect(screen.getByTestId('registration-success-banner')).toBeInTheDocument();
      expect(screen.getByText(/account created successfully!/i)).toBeInTheDocument();
    });
  });

  it('should display error banner when email is already registered in backend (409 Conflict)', async () => {
    mockRegisterMutation.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: { detail: 'A user with this email address already exists.' },
      }),
    });

    renderRegisterForm();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/institutional email/i), {
      target: { value: 'existing@cambridge.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'EngineAnalytical1843!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'EngineAnalytical1843!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/a user with this email address already exists/i),
      ).toBeInTheDocument();
    });
  });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../auth/authSlice';
import { baseApi } from '../../api/baseApi';
import { PasswordForm } from '../components/PasswordForm';

const mockUpdatePassword = vi.fn();

vi.mock('../userApiSlice', async () => {
  const actual = await vi.importActual('../userApiSlice');
  return {
    ...actual,
    useUpdatePasswordMutation: () => [mockUpdatePassword, { isLoading: false }],
  };
});

const renderPasswordForm = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
  });

  return render(
    <Provider store={store}>
      <PasswordForm />
    </Provider>,
  );
};

describe('<PasswordForm /> Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render password inputs, session warning, and submit button', () => {
    renderPasswordForm();

    expect(screen.getByLabelText(/^current password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^confirm new password$/i, { selector: 'input' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /changing your password automatically increments your security token version/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('should validate and reject empty submissions', async () => {
    renderPasswordForm();

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('should reject when new password does not fulfill complexity criteria (length, uppercase, number)', async () => {
    renderPasswordForm();

    fireEvent.change(screen.getByLabelText(/^current password$/i, { selector: 'input' }), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i, { selector: 'input' }), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i, { selector: 'input' }), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('should reject when confirm new password does not match new password', async () => {
    renderPasswordForm();

    fireEvent.change(screen.getByLabelText(/^current password$/i, { selector: 'input' }), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i, { selector: 'input' }), {
      target: { value: 'BrandNewPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i, { selector: 'input' }), {
      target: { value: 'DifferentNewPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/new passwords do not match/i)).toBeInTheDocument();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('should submit valid password rotation and render success notification', async () => {
    mockUpdatePassword.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        status: 'success',
        message: 'Password updated securely. Other sessions invalidated.',
      }),
    });

    renderPasswordForm();

    fireEvent.change(screen.getByLabelText(/^current password$/i, { selector: 'input' }), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i, { selector: 'input' }), {
      target: { value: 'BrandNewPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i, { selector: 'input' }), {
      target: { value: 'BrandNewPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith({
        currentPassword: 'OldPassword123!',
        newPassword: 'BrandNewPass123!',
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/password updated securely/i)).toBeInTheDocument();
    });
  });

  it('should display error alert when current password is invalid (401)', async () => {
    mockUpdatePassword.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 401,
        data: { detail: 'Invalid current password.' },
      }),
    });

    renderPasswordForm();

    fireEvent.change(screen.getByLabelText(/^current password$/i, { selector: 'input' }), {
      target: { value: 'WrongCurrentPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i, { selector: 'input' }), {
      target: { value: 'BrandNewPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i, { selector: 'input' }), {
      target: { value: 'BrandNewPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid current password/i)).toBeInTheDocument();
    });
  });
});

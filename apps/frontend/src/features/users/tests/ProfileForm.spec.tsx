/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../auth/authSlice';
import { baseApi } from '../../api/baseApi';
import { ProfileForm } from '../components/ProfileForm';

const mockUpdateProfile = vi.fn();
const mockProfileData = {
  data: {
    user: {
      id: 'usr_curie',
      email: 'marie.curie@sorbonne.fr',
      firstName: 'Marie',
      lastName: 'Curie',
      role: 'RESEARCHER',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
};

vi.mock('../userApiSlice', async () => {
  const actual = await vi.importActual('../userApiSlice');
  return {
    ...actual,
    useGetProfileQuery: () => ({
      data: mockProfileData,
      isLoading: false,
    }),
    useUpdateProfileMutation: () => [mockUpdateProfile, { isLoading: false }],
  };
});

const renderProfileForm = () => {
  const store = configureStore({
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
          role: 'RESEARCHER',
        },
        token: 'valid.token',
        isAuthenticated: true,
      },
    },
  });

  return render(
    <Provider store={store}>
      <ProfileForm />
    </Provider>,
  );
};

describe('<ProfileForm /> Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render pre-populated profile inputs and read-only account badges', () => {
    renderProfileForm();

    expect(screen.getByLabelText(/institutional email/i)).toHaveValue('marie.curie@sorbonne.fr');
    expect(screen.getByLabelText(/system role/i)).toHaveValue('RESEARCHER');
    expect(screen.getByLabelText(/^first name/i)).toHaveValue('Marie');
    expect(screen.getByLabelText(/^last name/i)).toHaveValue('Curie');
  });

  it('should validate and reject empty first name or last name', async () => {
    renderProfileForm();

    const firstNameInput = screen.getByLabelText(/^first name/i);
    fireEvent.change(firstNameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('should submit updated profile data and render success notification', async () => {
    mockUpdateProfile.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          user: {
            id: 'usr_curie',
            email: 'marie.curie@sorbonne.fr',
            firstName: 'Madame',
            lastName: 'Curie',
            role: 'RESEARCHER',
          },
        },
      }),
    });

    renderProfileForm();

    const firstNameInput = screen.getByLabelText(/^first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Madame' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        firstName: 'Madame',
        lastName: 'Curie',
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/profile information updated successfully/i)).toBeInTheDocument();
    });
  });

  it('should render error alert when API mutation fails', async () => {
    mockUpdateProfile.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 400,
        data: { detail: 'Unrecognized or unauthorized fields in payload.' },
      }),
    });

    renderProfileForm();

    const lastNameInput = screen.getByLabelText(/^last name/i);
    fireEvent.change(lastNameInput, { target: { value: 'Sklodowska' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/unrecognized or unauthorized fields in payload/i),
      ).toBeInTheDocument();
    });
  });
});

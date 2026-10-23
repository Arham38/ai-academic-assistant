import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUpdateProfileMutation, useGetProfileQuery } from '../userApiSlice';
import { UpdateProfileSchema, UpdateProfileFormData } from '../schemas/userSchemas';

export const ProfileForm: React.FC = () => {
  const { user: authUser, role } = useAuth();
  const { data: profileData } = useGetProfileQuery();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentUser = profileData?.data?.user || authUser;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(UpdateProfileSchema as never),
    defaultValues: {
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
    },
    mode: 'onTouched',
  });

  const userFirstName = currentUser?.firstName;
  const userLastName = currentUser?.lastName;

  // Sync form defaults whenever user profile finishes hydrating
  useEffect(() => {
    if (userFirstName !== undefined || userLastName !== undefined) {
      reset({
        firstName: userFirstName || '',
        lastName: userLastName || '',
      });
    }
  }, [userFirstName, userLastName, reset]);

  const onSubmit = async (data: UpdateProfileFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateProfile(data).unwrap();
      setSuccessMessage('Profile information updated successfully.');
      reset(data); // Re-baseline dirty state with new values
    } catch (err: unknown) {
      const errorResponse = err as {
        data?: { detail?: string; message?: string };
      };
      setErrorMessage(
        errorResponse?.data?.detail ||
          errorResponse?.data?.message ||
          'Failed to update profile. Please verify your details.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-sm text-red-700"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Read-Only Account Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="profile-email-readonly"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Institutional Email (Immutable)
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="profile-email-readonly"
              type="text"
              readOnly
              disabled
              value={currentUser?.email || ''}
              className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-role-readonly"
            className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
          >
            System Role (Managed by Admin)
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Shield className="w-4 h-4" />
            </div>
            <input
              id="profile-role-readonly"
              type="text"
              readOnly
              disabled
              value={role || 'STUDENT'}
              className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Editable Name Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="profile-firstName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            First Name
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="profile-firstName"
              type="text"
              placeholder="First name"
              {...register('firstName')}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'profile-firstName-error' : undefined}
              className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                errors.firstName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
          </div>
          {errors.firstName && (
            <p id="profile-firstName-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="profile-lastName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Last Name
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="profile-lastName"
              type="text"
              placeholder="Last name"
              {...register('lastName')}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'profile-lastName-error' : undefined}
              className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                errors.lastName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
          </div>
          {errors.lastName && (
            <p id="profile-lastName-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Form Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading || !isDirty}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving Profile...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
};

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useUpdatePasswordMutation } from '../userApiSlice';
import { UpdatePasswordSchema, UpdatePasswordFormData } from '../schemas/userSchemas';

export const PasswordForm: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(UpdatePasswordSchema as never),
    mode: 'onTouched',
  });

  const newPasswordValue = watch('newPassword', '');
  const hasMinLength = newPasswordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPasswordValue);
  const hasNumber = /[0-9]/.test(newPasswordValue);

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).unwrap();

      setSuccessMessage(
        response.message ||
          'Password updated securely. Other device sessions have been invalidated.',
      );
      reset();
    } catch (err: unknown) {
      const errorResponse = err as {
        data?: { detail?: string; message?: string };
        status?: number;
      };

      if (errorResponse?.data?.detail) {
        setErrorMessage(errorResponse.data.detail);
      } else if (errorResponse?.data?.message) {
        setErrorMessage(errorResponse.data.message);
      } else if (errorResponse?.status === 401) {
        setErrorMessage('Invalid current password.');
      } else {
        setErrorMessage('Failed to update password. Please verify your credentials and try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Session Invalidation Warning */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3 text-xs text-amber-800">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          Changing your password automatically increments your security token version, logging out
          all other active devices and browser sessions for your protection.
        </span>
      </div>

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

      {/* Current Password Field */}
      <div>
        <label
          htmlFor="currentPassword"
          className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5"
        >
          Current Password
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
            {...register('currentPassword')}
            aria-invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
            className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 transition-colors ${
              errors.currentPassword
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-input focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-950'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground focus:outline-hidden"
          >
            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.currentPassword && (
          <p id="current-password-error" className="mt-1.5 text-xs text-red-600 font-medium">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      {/* New Password Field */}
      <div>
        <label
          htmlFor="newPassword"
          className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5"
        >
          New Password
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 chars, 1 uppercase, 1 number"
            {...register('newPassword')}
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
            className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 transition-colors ${
              errors.newPassword
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-input focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-950'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground focus:outline-hidden"
          >
            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.newPassword && (
          <p id="new-password-error" className="mt-1.5 text-xs text-red-600 font-medium">
            {errors.newPassword.message}
          </p>
        )}

        {/* Real-time complexity check helpers */}
        <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-slate-500">
          <span className={hasMinLength ? 'text-emerald-600 font-semibold' : ''}>
            {hasMinLength ? '✓' : '•'} 8+ characters
          </span>
          <span className={hasUppercase ? 'text-emerald-600 font-semibold' : ''}>
            {hasUppercase ? '✓' : '•'} Uppercase
          </span>
          <span className={hasNumber ? 'text-emerald-600 font-semibold' : ''}>
            {hasNumber ? '✓' : '•'} Number
          </span>
        </div>
      </div>

      {/* Confirm New Password Field */}
      <div>
        <label
          htmlFor="confirmNewPassword"
          className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5"
        >
          Confirm New Password
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="confirmNewPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat new password"
            {...register('confirmNewPassword')}
            aria-invalid={!!errors.confirmNewPassword}
            aria-describedby={errors.confirmNewPassword ? 'confirm-new-password-error' : undefined}
            className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 transition-colors ${
              errors.confirmNewPassword
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-input focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-950'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground focus:outline-hidden"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmNewPassword && (
          <p id="confirm-new-password-error" className="mt-1.5 text-xs text-red-600 font-medium">
            {errors.confirmNewPassword.message}
          </p>
        )}
      </div>

      {/* Form Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating Password...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </div>
    </form>
  );
};

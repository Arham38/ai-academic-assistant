import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Lock,
  Building,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { RegisterSchema, RegisterFormData } from '../schemas/authSchemas';
import { useRegisterMutation } from '../authApiSlice';

export const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema as never),
    mode: 'onTouched',
  });

  const passwordValue = watch('password', '');
  const hasMinLength = passwordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        institutionId: data.institutionId || undefined,
      }).unwrap();

      setRegistrationSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      const errorResponse = err as {
        data?: { detail?: string; message?: string };
        status?: number;
      };

      if (errorResponse?.data?.detail) {
        setApiError(errorResponse.data.detail);
      } else if (errorResponse?.data?.message) {
        setApiError(errorResponse.data.message);
      } else if (errorResponse?.status === 409) {
        setApiError('A user with this email address already exists.');
      } else {
        setApiError('Registration failed. Please verify your details and try again.');
      }
    }
  };

  if (registrationSuccess) {
    return (
      <div data-testid="registration-success-banner" className="text-center py-6 space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Account Created Successfully!</h3>
        <p className="text-sm text-slate-600">Redirecting you to the sign-in portal...</p>
        <Link
          to="/login"
          className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          Sign in manually now &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Backend API Error Banner */}
      {apiError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-sm text-red-700"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Name Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="register-firstName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            First Name
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              id="register-firstName"
              type="text"
              placeholder="Katherine"
              {...register('firstName')}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              className={`block w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                errors.firstName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
          </div>
          {errors.firstName && (
            <p id="firstName-error" className="mt-1 text-xs text-red-600 font-medium">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-lastName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Last Name
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              id="register-lastName"
              type="text"
              placeholder="Johnson"
              {...register('lastName')}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              className={`block w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                errors.lastName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
          </div>
          {errors.lastName && (
            <p id="lastName-error" className="mt-1 text-xs text-red-600 font-medium">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="register-email"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Institutional Email
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="katherine.johnson@nasa.gov"
            {...register('email')}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'reg-email-error' : undefined}
            className={`block w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
              errors.email
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
        </div>
        {errors.email && (
          <p id="reg-email-error" className="mt-1 text-xs text-red-600 font-medium">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="register-password"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Password
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 chars, 1 uppercase, 1 number"
            {...register('password')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'reg-password-error' : undefined}
            className={`block w-full pl-10 pr-10 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
              errors.password
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="reg-password-error" className="mt-1 text-xs text-red-600 font-medium">
            {errors.password.message}
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

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="register-confirmPassword"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Confirm Password
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="register-confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat password"
            {...register('confirmPassword')}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            className={`block w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
              errors.confirmPassword
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
        </div>
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="mt-1 text-xs text-red-600 font-medium">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Optional Institution ID */}
      <div>
        <label
          htmlFor="register-institutionId"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Institutional Affiliation (Optional)
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Building className="w-4 h-4" />
          </div>
          <input
            id="register-institutionId"
            type="text"
            placeholder="MIT-LABS-01 (optional)"
            {...register('institutionId')}
            className="block w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:border-indigo-500 focus:ring-indigo-100 transition-colors"
          />
        </div>
      </div>

      {/* Submit Action */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Registering Account...
          </>
        ) : (
          'Create Scholar Account'
        )}
      </button>
    </form>
  );
};

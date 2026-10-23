import React from 'react';
import { User, KeyRound, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { ProfileForm } from '../../features/users/components/ProfileForm';
import { PasswordForm } from '../../features/users/components/PasswordForm';

export const SettingsPage: React.FC = () => {
  const { user, role } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details, institutional profile, and account security.
        </p>
      </div>

      {/* Account Overview Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-xl uppercase shadow-2xs">
            {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            {user?.lastName?.[0] || ''}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-slate-900">
                {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}` : 'Scholar Account'}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </span>
            </div>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            {role ?? 'STUDENT'} Privileges
          </span>
        </div>
      </div>

      {/* Section 1: Profile Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
            <p className="text-xs text-slate-500">
              Update your publicly visible name and scholarly identification
            </p>
          </div>
        </div>

        <ProfileForm />
      </div>

      {/* Section 2: Security & Password Rotation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Security & Credentials</h2>
            <p className="text-xs text-slate-500">
              Rotate your account password and manage active session invalidation
            </p>
          </div>
        </div>

        <PasswordForm />
      </div>
    </div>
  );
};

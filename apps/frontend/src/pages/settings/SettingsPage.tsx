import React from 'react';
import { User, KeyRound, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { ProfileForm } from '../../features/users/components/ProfileForm';
import { PasswordForm } from '../../features/users/components/PasswordForm';
import { formatUserDisplayName, formatUserInitials } from '../../utils/userUtils';

export const SettingsPage: React.FC = () => {
  const { user, role } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, institutional profile, and account security.
        </p>
      </div>

      {/* Account Overview Header Card */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl uppercase shadow-2xs">
            {formatUserInitials(user)}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-foreground">{formatUserDisplayName(user)}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 bg-muted text-foreground rounded-lg text-xs font-semibold border border-border">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            {role ?? 'STUDENT'} Privileges
          </span>
        </div>
      </div>

      {/* Section 1: Profile Information */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-border">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            <p className="text-xs text-muted-foreground">
              Update your publicly visible name and scholarly identification
            </p>
          </div>
        </div>

        <ProfileForm />
      </div>

      {/* Section 2: Security & Password Rotation */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-border">
          <div className="p-2.5 bg-muted text-foreground rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Security & Credentials</h2>
            <p className="text-xs text-muted-foreground">
              Rotate your account password and manage active session invalidation
            </p>
          </div>
        </div>

        <PasswordForm />
      </div>
    </div>
  );
};

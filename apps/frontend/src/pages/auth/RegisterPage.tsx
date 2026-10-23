import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { RegisterForm } from '../../features/auth/components/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Scholar Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Join your institution&apos;s verified AI integrity workspace
          </p>
        </div>

        {/* Form Body */}
        <RegisterForm />

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

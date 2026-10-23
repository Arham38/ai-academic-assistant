import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { LoginForm } from '../../features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-8 sm:my-12">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Institutional Sign In
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your research, plagiarism checks, and AI suites
          </p>
        </div>

        {/* Form Body */}
        <LoginForm />

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
          New to the integrity platform?{' '}
          <Link
            to="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

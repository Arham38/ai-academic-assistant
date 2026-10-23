import React from 'react';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Sign In</h1>
      <p className="text-sm text-slate-600 mb-6">Enter your institutional credentials.</p>
      <div id="login-form-container">Login Form Placeholder</div>
      <div className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Register
        </Link>
      </div>
    </div>
  );
};

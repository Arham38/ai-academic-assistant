import React from 'react';
import { Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create an Account</h1>
      <p className="text-sm text-slate-600 mb-6">
        Join your institution&apos;s AI integrity workspace.
      </p>
      <div id="register-form-container">Register Form Placeholder</div>
      <div className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Sign In
        </Link>
      </div>
    </div>
  );
};

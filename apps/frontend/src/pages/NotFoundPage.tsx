import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 bg-rose-50 text-rose-600 rounded-full mb-4">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
        404 - Page Not Found
      </h1>
      <p className="mt-2 text-slate-500 max-w-md">
        The requested academic route does not exist or you do not have authorization to view this
        partition.
      </p>
      <Link
        to="/"
        className="mt-6 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};

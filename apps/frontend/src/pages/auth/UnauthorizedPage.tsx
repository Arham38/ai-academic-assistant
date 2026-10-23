import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        403 - Access Denied
      </h1>
      <p className="text-slate-600 max-w-md mb-8">
        You do not possess the required institutional privileges or role to access this resource.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Return to Dashboard
      </Link>
    </div>
  );
};

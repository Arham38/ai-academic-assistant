import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Shield,
  FileText,
  Sparkles,
  LogOut,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useLogoutMutation } from '../../features/auth/authApiSlice';

export const DashboardPage: React.FC = () => {
  const { user, role, isAdmin } = useAuth();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Handled in RTK Query onQueryStarted
    } finally {
      navigate('/login');
    }
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RESEARCHER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STUDENT':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back,{' '}
              {user?.firstName
                ? `${user.firstName} ${user.lastName ?? ''}`
                : (user?.email ?? 'Scholar')}
            </h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor()}`}
            >
              <Shield className="w-3.5 h-3.5 mr-1" />
              {role ?? 'STUDENT'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Institutional Account: <span className="font-medium text-slate-700">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Settings className="w-4 h-4 mr-2 text-slate-500" />
              Admin Portal
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Feature Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Document Integrity Analysis</h2>
          <p className="text-sm text-slate-600 mb-4">
            Perform 4-layer plagiarism scans, semantic similarity checks, and citation verification.
          </p>
          <div className="flex items-center text-xs font-semibold text-indigo-600">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Ready for submission
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Agentic RAG Assistant</h2>
          <p className="text-sm text-slate-600 mb-4">
            Query academic knowledge bases with multi-agent LangGraph supervisor orchestration.
          </p>
          <div className="flex items-center text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Vector stores synchronized
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Institutional Quotas</h2>
          <p className="text-sm text-slate-600 mb-4">
            Track monthly compute consumption, vector tokens, and document page thresholds.
          </p>
          <div className="flex items-center text-xs font-semibold text-purple-600">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Active allocation
          </div>
        </div>
      </div>
    </div>
  );
};

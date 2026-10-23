import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from './features/auth/hooks/useAuth';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // When authenticated, DashboardLayout provides the persistent role-aware layout frame
  if (isAuthenticated) {
    return <Outlet />;
  }

  // Public/Unauthenticated layout shell (Login, Register, Public information)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Public Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:bg-indigo-700 transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block">
                Academic Assistant
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                AI Integrity Suite
              </span>
            </div>
          </Link>

          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-slate-600 hover:text-indigo-600 transition-colors font-semibold"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-xs shadow-xs"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Public Content Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col justify-center">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} AI Academic Assistant Platform. Enterprise Multi-Agent
        Architecture.
      </footer>
    </div>
  );
};

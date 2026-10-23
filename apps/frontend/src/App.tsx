import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Shield } from 'lucide-react';
import { useAuth } from './features/auth/hooks/useAuth';
import { useLogoutMutation } from './features/auth/authApiSlice';

export const App: React.FC = () => {
  const { isAuthenticated, user, role, isAdmin } = useAuth();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Handled in onQueryStarted
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
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

          <nav className="flex items-center space-x-6 text-sm font-medium text-slate-600">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="hover:text-indigo-600 transition-colors flex items-center"
                  >
                    <Shield className="w-3.5 h-3.5 mr-1 text-purple-600" />
                    Admin
                  </Link>
                )}
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">
                  {user?.email} ({role})
                </span>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hover:text-red-600 transition-colors flex items-center disabled:opacity-50"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-indigo-600 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-xs shadow-xs"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} AI Academic Assistant Platform. Enterprise Multi-Agent
        Architecture.
      </footer>
    </div>
  );
};

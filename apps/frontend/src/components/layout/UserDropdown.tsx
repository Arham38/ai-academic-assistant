import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useLogoutMutation } from '../../features/auth/authApiSlice';
import { formatUserDisplayName, formatUserInitials } from '../../utils/userUtils';

export const UserDropdown: React.FC = () => {
  const { user, role, isAdmin, isResearcher } = useAuth();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logout().unwrap();
    } catch {
      // Handled in onQueryStarted
    } finally {
      navigate('/login');
    }
  };

  const displayName = formatUserDisplayName(user);
  const userInitials = formatUserInitials(user);

  const getRoleBadgeClasses = () => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RESEARCHER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'STUDENT':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
        className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
      >
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
          {userInitials}
        </div>

        <div className="hidden sm:flex flex-col items-start text-left min-w-0 max-w-[140px]">
          <span className="text-sm font-semibold text-slate-800 truncate w-full">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-tight truncate w-full">
            {user?.email}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 z-50 py-2 divide-y divide-slate-100 focus:outline-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header Summary */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Account
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleBadgeClasses()}`}
              >
                <Shield className="w-3 h-3 mr-1" />
                {role ?? 'STUDENT'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Session Authenticated (JWT)</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            >
              <Settings className="w-4 h-4 mr-3 text-slate-400" />
              <span>Settings & Profile</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-purple-600 transition-colors"
              >
                <Shield className="w-4 h-4 mr-3 text-purple-500" />
                <span>Admin Console</span>
              </Link>
            )}

            {isResearcher && (
              <Link
                to="/dashboard/research"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <Shield className="w-4 h-4 mr-3 text-blue-500" />
                <span>Researcher Studio</span>
              </Link>
            )}
          </div>

          {/* Sign Out Action */}
          <div className="py-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              role="menuitem"
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 mr-3 animate-spin text-red-500" />
              ) : (
                <LogOut className="w-4 h-4 mr-3 text-red-500" />
              )}
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

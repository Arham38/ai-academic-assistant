import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, Activity, GraduationCap } from 'lucide-react';
import { UserDropdown } from './UserDropdown';

export interface HeaderProps {
  onToggleMobileMenu: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();

  const getBreadcrumbTitle = (pathname: string): { section: string; title: string } => {
    if (pathname.startsWith('/dashboard/student')) {
      return { section: 'Academic Hub', title: 'Student Hub' };
    }
    if (pathname.startsWith('/dashboard/research')) {
      return { section: 'Academic Hub', title: 'Researcher Hub' };
    }
    if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin')) {
      return { section: 'System Administration', title: 'Admin Panel' };
    }
    if (pathname.startsWith('/documents')) {
      return { section: 'Repository', title: 'My Documents' };
    }
    if (pathname.startsWith('/settings')) {
      return { section: 'Account', title: 'Settings' };
    }
    if (pathname.startsWith('/dashboard')) {
      return { section: 'Academic Hub', title: 'Dashboard' };
    }
    return { section: 'Platform', title: 'Academic Portal' };
  };

  const { section, title } = getBreadcrumbTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left Side: Mobile Hamburger & Dynamic Breadcrumbs */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl md:hidden transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile brand mark (visible only on mobile) */}
          <Link to="/" className="flex items-center space-x-2 md:hidden">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
              <GraduationCap className="w-4 h-4" />
            </div>
          </Link>

          {/* Dynamic Breadcrumbs */}
          <nav
            className="flex items-center space-x-2 text-xs sm:text-sm font-medium"
            aria-label="Breadcrumb"
          >
            <span className="text-slate-400 hidden sm:inline">{section}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
            <h1 className="text-slate-800 font-bold tracking-tight text-sm sm:text-base">
              {title}
            </h1>
          </nav>
        </div>

        {/* Right Side: Gateway Telemetry & Profile Dropdown */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          {/* Institutional Telemetry Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <span>AI Gateway Connected</span>
          </div>

          {/* User Profile Dropdown */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

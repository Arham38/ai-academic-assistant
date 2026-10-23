import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Activity, GraduationCap } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { UserDropdown } from './UserDropdown';
import { ThemeToggle } from '../ui/theme-toggle';

export interface HeaderProps {
  onToggleMobileMenu: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  dynamicTitleResolver?: (segment: string, fullPath: string) => string | undefined;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, dynamicTitleResolver }) => {
  return (
    <header className="h-16 bg-card/95 backdrop-blur-xs text-card-foreground border-b border-border sticky top-0 z-30 shadow-2xs">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left Side: Mobile Hamburger & Dynamic Breadcrumbs */}
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl md:hidden transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile brand mark (visible only on mobile) */}
          <Link to="/" className="flex items-center space-x-2 md:hidden shrink-0">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
              <GraduationCap className="w-4 h-4" />
            </div>
          </Link>

          {/* Dynamic Breadcrumbs */}
          <div className="min-w-0">
            <Breadcrumbs dynamicTitleResolver={dynamicTitleResolver} />
          </div>
        </div>

        {/* Right Side: Gateway Telemetry & Profile Dropdown */}
        <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
          {/* Institutional Telemetry Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <span>AI Gateway Connected</span>
          </div>

          {/* Theme Selector Toggle */}
          <ThemeToggle />

          {/* User Profile Dropdown */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

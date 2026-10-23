import React from 'react';

export interface HeaderProps {
  onToggleMobileMenu: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <button
        type="button"
        onClick={onToggleMobileMenu}
        className="md:hidden p-2 text-slate-500 hover:text-slate-800"
        aria-label="Open navigation menu"
      >
        Menu
      </button>
      <div className="font-semibold text-sm text-slate-800">Academic Portal</div>
    </header>
  );
};

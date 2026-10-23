import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../app/providers/ThemeProvider';
import { cn } from '../../utils/cn';

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const getActiveIcon = () => {
    if (theme === 'system') {
      return <Laptop className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
    }
    if (resolvedTheme === 'dark') {
      return <Moon className="w-4 h-4 text-indigo-400" />;
    }
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Toggle theme"
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/80 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
      >
        {getActiveIcon()}
      </button>

      {/* Theme Selection Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-label="Theme options"
          className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1.5 focus:outline-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('light')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
              theme === 'light' && 'text-indigo-600 dark:text-indigo-400 font-bold',
            )}
          >
            <div className="flex items-center space-x-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === 'light' && (
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('dark')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
              theme === 'dark' && 'text-indigo-600 dark:text-indigo-400 font-bold',
            )}
          >
            <div className="flex items-center space-x-2">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark</span>
            </div>
            {theme === 'dark' && (
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('system')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
              theme === 'system' && 'text-indigo-600 dark:text-indigo-400 font-bold',
            )}
          >
            <div className="flex items-center space-x-2">
              <Laptop className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>System</span>
            </div>
            {theme === 'system' && (
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

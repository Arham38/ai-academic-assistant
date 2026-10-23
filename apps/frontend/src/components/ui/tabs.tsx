import React from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TabItem {
  label: string;
  path: string;
  icon?: LucideIcon;
  badge?: string | number;
  end?: boolean;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[];
  variant?: 'underline' | 'pills';
  ariaLabel?: string;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ tabs, variant = 'underline', ariaLabel = 'Navigation Tabs', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-full', variant === 'underline' && 'border-b border-slate-200', className)}
        {...props}
      >
        <nav
          role="tablist"
          aria-label={ariaLabel}
          className={cn(
            'flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar',
            variant === 'pills' && 'p-1 bg-slate-100/80 rounded-xl',
          )}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                role="tab"
                className={({ isActive }) =>
                  cn(
                    'group inline-flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/50',
                    variant === 'underline' && [
                      'border-b-2 -mb-px',
                      isActive
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                        : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300',
                    ],
                    variant === 'pills' && [
                      'rounded-lg',
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50',
                    ],
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon && (
                      <Icon
                        className={cn(
                          'w-4 h-4 mr-2 transition-colors shrink-0',
                          isActive
                            ? 'text-indigo-600'
                            : 'text-slate-400 group-hover:text-slate-600',
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={cn(
                          'ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors',
                          isActive
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  },
);

Tabs.displayName = 'Tabs';

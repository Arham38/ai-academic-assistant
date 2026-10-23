import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { GraduationCap, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { navigationConfig, getAuthorizedNavigation } from '../../config/navigation';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse, onItemClick }) => {
  const { role, user } = useAuth();
  const visibleItems = getAuthorizedNavigation(navigationConfig, role);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div
        className={`flex items-center h-16 border-b border-slate-200 shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'px-5'
        }`}
      >
        <Link
          to="/"
          onClick={onItemClick}
          className="flex items-center space-x-3 group"
          title="AI Academic Assistant"
        >
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:bg-indigo-700 transition-colors shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-sm font-bold text-slate-900 tracking-tight block truncate">
                Academic Assistant
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase block">
                AI Integrity Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation Link Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {!isCollapsed && (
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Workspaces & Portals
            </h3>
          )}

          <nav className="space-y-1" aria-label="Main Navigation">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onItemClick}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `group flex items-center rounded-xl transition-all duration-150 ${
                      isCollapsed
                        ? 'justify-center p-3 w-12 h-12 mx-auto'
                        : 'px-3.5 py-2.5 space-x-3 w-full'
                    } ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                          isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate text-sm tracking-tight">{item.name}</span>
                          {item.badge && (
                            <span
                              className={`ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border ${
                                item.badge === 'System'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Active Role Indicator Card (when expanded) */}
      {!isCollapsed && (
        <div className="px-4 py-3 mx-3 mb-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Active Role: {role ?? 'STUDENT'}</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {user?.email ?? 'scholar@institution.edu'}
          </p>
        </div>
      )}

      {/* Desktop Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-xl p-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!isCollapsed && <span>Collapse Sidebar</span>}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
};

import React from 'react';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  return (
    <div className="flex flex-col h-full bg-white select-none">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <span className="font-bold text-sm text-slate-800">
          {isCollapsed ? 'AA' : 'Academic Assistant'}
        </span>
      </div>
      <div className="flex-1 p-3">{/* Navigation items will be injected */}</div>
      <div className="p-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-xs text-slate-500 hover:text-slate-800 p-2 w-full text-center"
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
    </div>
  );
};

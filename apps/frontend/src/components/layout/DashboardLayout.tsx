import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useGetProfileQuery } from '../../features/users/userApiSlice';

const SIDEBAR_STORAGE_KEY = 'academic_assistant_sidebar_collapsed';

export const DashboardLayout: React.FC = () => {
  // Ensure authenticated user profile (firstName, lastName) is hydrated and synchronized globally
  useGetProfileQuery();

  // Persistent desktop sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Mobile sliding drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
    } catch {
      // Storage unavailable or blocked
    }
  }, [isCollapsed]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleOpenMobile = () => {
    setIsMobileOpen(true);
  };

  const handleCloseMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <div
      className={`min-h-screen bg-background font-sans antialiased text-foreground transition-all duration-300 md:grid ${
        isCollapsed ? 'md:grid-cols-[80px_1fr]' : 'md:grid-cols-[260px_1fr]'
      }`}
    >
      {/* 1. Desktop Fixed/Sticky Sidebar */}
      <aside
        className="hidden md:block h-screen sticky top-0 z-20 bg-card border-r border-border overflow-y-auto"
        aria-label="Desktop Sidebar Navigation"
      >
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
      </aside>

      {/* 2. Mobile Responsive Sliding Drawer (Sheet) */}
      <MobileNav isOpen={isMobileOpen} onClose={handleCloseMobile} />

      {/* 3. Main Application Column */}
      <div className="flex flex-col min-h-screen min-w-0">
        {/* Sticky Top Header */}
        <Header
          onToggleMobileMenu={handleOpenMobile}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Independently Scrolling Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Global Footer */}
        <footer className="bg-card border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AI Academic Assistant Platform. Enterprise Multi-Agent
          Architecture.
        </footer>
      </div>
    </div>
  );
};

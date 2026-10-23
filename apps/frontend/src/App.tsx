import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-xs group-hover:bg-brand-700 transition-colors">
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
            <Link to="/" className="hover:text-brand-600 transition-colors">
              Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md font-semibold border border-brand-200">
              v0.1.0-alpha
            </span>
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

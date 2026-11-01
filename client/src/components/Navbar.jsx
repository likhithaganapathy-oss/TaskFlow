import React from 'react';
import { Menu, LogOut, CheckSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onOpenMobileSidebar, onOpenNewTaskModal }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 text-slate-600 rounded-lg lg:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Task<span className="text-blue-600">Flow</span>
          </span>
        </div>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-3">
        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold uppercase ${
                isAdmin
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {user?.name ? user.name.charAt(0) : isAdmin ? 'A' : 'S'}
            </div>
            <div className="hidden md:block text-left pr-1">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                {user?.name || (isAdmin ? 'Admin' : 'Student')}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight font-medium">
                {isAdmin ? 'Administrator' : 'Student'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Log out of TaskFlow"
            className="p-2 text-slate-500 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


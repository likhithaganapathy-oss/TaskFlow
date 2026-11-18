import React from 'react';
import { Menu, LogOut, CheckSquare, Sun, Moon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationCenter from './NotificationCenter';
import { Link } from 'react-router-dom';

const Navbar = ({ onOpenMobileSidebar }) => {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-300 rounded-lg lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Task<span className="text-blue-600 dark:text-blue-400">Flow</span>
          </span>
        </div>
      </div>

      {/* Right: Quick actions, Notifications, Dark Mode & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark / Light Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Smart In-App Notification Center */}
        <NotificationCenter />

        {/* User Pill / Profile Link */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <Link
            to="/profile"
            title="Manage profile & preferences"
            className="flex items-center gap-2.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
          >
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold uppercase shadow-xs ${
                isAdmin
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}
            >
              {user?.name ? user.name.charAt(0) : isAdmin ? 'A' : 'S'}
            </div>
            <div className="hidden md:block text-left pr-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight truncate max-w-[120px]">
                {user?.name || (isAdmin ? 'Admin' : 'Student')}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-medium">
                {isAdmin ? 'Administrator' : 'Student'}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={logout}
            title="Log out of TaskFlow"
            className="p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
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

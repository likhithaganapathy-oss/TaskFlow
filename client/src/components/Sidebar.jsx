import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  BarChart3,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  ShieldCheck,
  Users,
  Layers,
  FileCheck2,
  Megaphone,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout, isAdmin } = useAuth();

  // Student navigation links
  const studentNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Assignments',
      path: '/tasks',
      icon: BookOpen,
    },
    {
      name: 'Calendar & Deadlines',
      path: '/calendar',
      icon: Calendar,
      badge: 'Feature 2',
    },
    {
      name: 'Study Planner',
      path: '/study-planner',
      icon: Clock,
      badge: 'Schedule',
    },
    {
      name: 'Pomodoro Focus',
      path: '/pomodoro',
      icon: Clock,
      badge: 'Timer',
    },
    {
      name: 'AI Study Assistant',
      path: '/ai-assistant',
      icon: Sparkles,
      badge: 'AI ✨',
    },
    {
      name: 'Productivity Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      name: 'Profile & Settings',
      path: '/profile',
      icon: User,
    },
  ];

  // Admin navigation links
  const adminNavItems = [
    {
      name: 'Admin Overview',
      path: '/admin/dashboard',
      icon: ShieldCheck,
    },
    {
      name: 'Student Accounts',
      path: '/admin/users',
      icon: Users,
    },
    {
      name: 'All Assignments',
      path: '/admin/tasks',
      icon: Layers,
    },
    {
      name: 'Submission Console',
      path: '/admin/submissions',
      icon: FileCheck2,
    },
    {
      name: 'Academic Subjects',
      path: '/admin/subjects',
      icon: BookOpen,
    },
    {
      name: 'Project Groups',
      path: '/admin/groups',
      icon: Users,
    },
    {
      name: 'Announcements',
      path: '/admin/announcements',
      icon: Megaphone,
    },
    {
      name: 'Report Generator',
      path: '/admin/reports',
      icon: FileSpreadsheet,
    },
    {
      name: 'Campus Calendar',
      path: '/admin/calendar',
      icon: Calendar,
    },
    {
      name: 'Campus Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      name: 'Profile & Settings',
      path: '/profile',
      icon: User,
    },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 ease-in-out lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-72`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-xl text-white shadow-lg ${
                isAdmin
                  ? 'bg-purple-600 shadow-purple-500/20'
                  : 'bg-blue-600 shadow-blue-500/20'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <CheckSquare className="w-6 h-6" />}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">
                  Task<span className={isAdmin ? 'text-purple-400' : 'text-blue-400'}>Flow</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {isAdmin ? 'Admin Console' : 'Student Portal'}
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 rounded-lg lg:hidden hover:bg-slate-800 hover:text-white"
            aria-label="Close sidebar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? isAdmin
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(!collapsed || mobileOpen) && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.badge.includes('AI')
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Collapse Toggle Button (Desktop only) */}
        <div className="hidden lg:flex items-center justify-between p-3 border-t border-slate-800">
          {!collapsed && (
            <span className="text-xs text-slate-500 font-medium pl-2">
              Collapse menu
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`p-2 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white transition-colors ${
              collapsed ? 'w-full flex justify-center' : ''
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Footer Profile & Quick Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full text-xs font-bold uppercase ${
                  isAdmin
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-white truncate">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {user?.email || ''}
                  </span>
                </div>
              )}
            </div>

            {(!collapsed || mobileOpen) && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

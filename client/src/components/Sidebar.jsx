import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
  X,
  ShieldCheck,
  Users,
  Layers,
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
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
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
            className="p-1.5 text-slate-400 rounded-lg lg:hidden hover:text-white hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse toggle on desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 text-slate-400 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
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

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {isAdmin ? (
            /* Admin Menu Group */
            <div className="space-y-1">
              {(!collapsed || mobileOpen) && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Institution Management
                </p>
              )}
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      } ${collapsed && !mobileOpen ? 'justify-center px-2' : ''}`
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          ) : (
            /* Student Links */
            <div className="space-y-1">
              {studentNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      } ${collapsed && !mobileOpen ? 'justify-center px-2' : ''}`
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        {/* Profile Info / Logout Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 ${
              collapsed && !mobileOpen ? 'justify-center p-1.5' : ''
            }`}
          >
            <div
              className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg font-semibold text-xs border ${
                isAdmin
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user?.name || (isAdmin ? 'Admin' : 'Student')}
                  </p>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isAdmin
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Student'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'user@taskflow.local'}
                </p>
              </div>
            )}

            {(!collapsed || mobileOpen) && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-slate-400 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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


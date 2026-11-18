import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  BookOpen,
  Calendar,
  Send,
  Award,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'assignment':
      return <BookOpen className="w-4 h-4 text-purple-500" />;
    case 'deadline':
      return <Calendar className="w-4 h-4 text-amber-500" />;
    case 'submission':
      return <Send className="w-4 h-4 text-emerald-500" />;
    case 'feedback':
      return <Award className="w-4 h-4 text-blue-500" />;
    default:
      return <Info className="w-4 h-4 text-slate-500" />;
  }
};

const formatTimeAgo = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications(false, 15);
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Graceful fail without blocking UI
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);

    const handleDataChanged = () => fetchNotifications();
    window.addEventListener('taskflow-data-changed', handleDataChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('taskflow-data-changed', handleDataChanged);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, link) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Notifications"
        aria-label="Notification center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline p-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold">No notifications yet</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  You'll be alerted about assignments and deadlines here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleMarkAsRead(n._id, n.link)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    !n.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !n.read
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {n.message}
                    </p>
                  </div>

                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

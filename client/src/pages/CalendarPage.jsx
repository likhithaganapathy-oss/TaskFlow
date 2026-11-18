import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CalendarPage = () => {
  const { isAdmin } = useAuth();
  const { showError } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = isAdmin
        ? await adminService.getAllTasks({ limit: 150 })
        : await taskService.getTasks();

      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (subjectFilter !== 'All' && t.subject !== subjectFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, subjectFilter, priorityFilter]);

  // Unique subjects
  const subjects = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Map tasks to dates (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks]);

  // Approaching deadlines (within 3 days)
  const now = new Date();
  const upcomingDeadlines = useMemo(() => {
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return filteredTasks
      .filter((t) => {
        const d = new Date(t.dueDate);
        return d >= now && d <= threeDaysLater && t.status !== 'Completed';
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [filteredTasks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl shadow-blue-950/20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/20">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Interactive Academic Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Calendar & Deadline Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
            Visualize approaching coursework deadlines, exam schedules, and avoid last-minute stress.
          </p>
        </div>

        {/* Calendar Nav Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl bg-white/10 p-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-xs font-bold whitespace-nowrap min-w-[120px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar & Approaching Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar Grid */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Subject Filter:
              </span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Subjects ({tasks.length})</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Priority:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Prev month tail */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[70px] sm:min-h-[90px] p-1.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 text-slate-300 dark:text-slate-700 text-xs border border-transparent"
                >
                  <span className="font-semibold">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const dayTasks = tasksByDate[dateKey] || [];
              const isToday =
                now.getDate() === dayNum &&
                now.getMonth() === month &&
                now.getFullYear() === year;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[70px] sm:min-h-[90px] p-1.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                      : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Pills */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[50px] sm:max-h-[60px]">
                    {dayTasks.map((task) => {
                      const isHigh = task.priority === 'High';
                      const isCompleted = task.status === 'Completed';

                      return (
                        <div
                          key={task._id}
                          onClick={() => setSelectedTask(task)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-all font-medium ${
                            isCompleted
                              ? 'bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400'
                              : isHigh
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900'
                              : task.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          }`}
                          title={`${task.title} (${task.subject})`}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Approaching Deadlines & Detail Viewer */}
        <div className="space-y-6">
          {/* Approaching Deadlines (Feature 2) */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Urgent Approaching Deadlines
              </h2>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <span>No assignments due in the next 72 hours!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTask(t)}
                    className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-amber-800 dark:text-amber-300 truncate">
                        {t.subject}
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                        Due {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {t.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Task Details Pane */}
          {selectedTask && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-blue-200 dark:border-blue-800 shadow-sm space-y-3 animate-scale-up">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {selectedTask.subject}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {selectedTask.title}
              </h3>

              {selectedTask.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-500 dark:text-slate-400">
                <p>
                  Due Date:{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(selectedTask.dueDate).toLocaleDateString()}
                  </span>
                </p>
                <p>
                  Priority:{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTask.priority}
                  </span>
                </p>
                <p>
                  Status:{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTask.status}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;

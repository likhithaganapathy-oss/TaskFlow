import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  BookOpen,
  Target,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  BarChart3,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { studyPlanService } from '../services/studyPlanService';
import { taskService } from '../services/taskService';

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

export default function StudyPlannerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [weekSchedule, setWeekSchedule] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);

  // Add session modal / form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [notes, setNotes] = useState('');

  // Daily target from user preferences (default 120 mins)
  const dailyTargetMinutes = user?.preferences?.dailyStudyGoalMinutes || 120;

  const fetchPlanAndWeek = useCallback(async () => {
    try {
      setLoading(true);
      const [dailyRes, weekRes] = await Promise.all([
        studyPlanService.getDailyPlan(selectedDate),
        studyPlanService.getWeeklySchedule(selectedDate),
      ]);

      if (dailyRes.success) {
        setPlan(dailyRes.plan);
        setNotes(dailyRes.plan?.notes || '');
      }
      if (weekRes.success) {
        setWeekSchedule(weekRes.weekSchedule || []);
      }
    } catch (err) {
      console.error('Failed to load study plan:', err);
      showToast('Failed to load study plan schedule.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    fetchPlanAndWeek();
  }, [fetchPlanAndWeek]);

  // Load pending assignments to allow 1-click import into study planner
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await taskService.getTasks({ status: 'Pending' });
        if (res.tasks) {
          setPendingAssignments(res.tasks);
        }
      } catch (err) {
        console.warn('Could not load pending tasks:', err);
      }
    };
    loadAssignments();
  }, []);

  const handleDateChange = (offset) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + offset);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const handleToggleTask = async (task) => {
    if (!plan?._id) return;
    try {
      const res = await studyPlanService.toggleTask(plan._id, task._id);
      if (res.success) {
        setPlan(res.plan);
        showToast(res.message, 'success');
        // Refresh weekly schedule counts
        studyPlanService.getWeeklySchedule(selectedDate).then((w) => {
          if (w.success) setWeekSchedule(w.weekSchedule);
        });
      }
    } catch (err) {
      showToast('Failed to update task status.', 'error');
    }
  };

  const handleAddSession = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      return showToast('Session title or topic is required.', 'error');
    }

    const newTask = {
      assignment: selectedAssignmentId || null,
      title: newTitle.trim(),
      subject: newSubject.trim() || 'General Study',
      plannedMinutes: Number(newDuration) || 30,
      completedMinutes: 0,
      isCompleted: false,
    };

    const currentTasks = plan?.plannedTasks || [];
    const updatedTasks = [...currentTasks, newTask];

    setPlan({
      ...plan,
      plannedTasks: updatedTasks,
    });

    setNewTitle('');
    setNewSubject('');
    setSelectedAssignmentId('');
    setNewDuration(30);
    setShowAddModal(false);
  };

  const handleDeleteTask = (index) => {
    if (!plan) return;
    const updated = plan.plannedTasks.filter((_, i) => i !== index);
    setPlan({ ...plan, plannedTasks: updated });
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const res = await studyPlanService.saveDailyPlan({
        date: selectedDate,
        plannedTasks: plan?.plannedTasks || [],
        notes,
      });
      if (res.success) {
        setPlan(res.plan);
        showToast('Study schedule & notes saved!', 'success');
        fetchPlanAndWeek();
      }
    } catch (err) {
      showToast('Failed to save study schedule.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAssignmentForSession = (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    const found = pendingAssignments.find((a) => a._id === assignmentId);
    if (found) {
      setNewTitle(`Work on: ${found.title}`);
      setNewSubject(found.subject);
    }
  };

  // Calculations
  const tasks = plan?.plannedTasks || [];
  const totalPlannedMinutes = tasks.reduce((sum, t) => sum + (t.plannedMinutes || 0), 0);
  const completedMinutes = tasks
    .filter((t) => t.isCompleted)
    .reduce((sum, t) => sum + (t.plannedMinutes || 0), 0);
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPercent =
    totalPlannedMinutes > 0 ? Math.min(100, Math.round((completedMinutes / totalPlannedMinutes) * 100)) : 0;
  const targetPercent = Math.min(100, Math.round((completedMinutes / dailyTargetMinutes) * 100));

  const isToday = selectedDate === getTodayDateStr();

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Feature S2: Academic Productivity
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            Study Planner & Schedules
            <Clock className="w-6 h-6 text-blue-500" />
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Plan daily and weekly study targets, track time allocation, and check off focused study blocks.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <Calendar className="w-4 h-4 text-blue-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs sm:text-sm font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateStr())}
              className="px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-800"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Weekly Schedule Mini-Cards */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <span>7-Day Study Horizon</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Daily Target: <strong>{dailyTargetMinutes} mins</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {weekSchedule.map((day) => {
            const isSelected = day.date === selectedDate;
            const dateObj = new Date(day.date + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString([], { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const hasMetGoal = day.totalPlannedMinutes >= dailyTargetMinutes;

            return (
              <button
                type="button"
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {dayName}
                  </span>
                  {hasMetGoal && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {dayNum}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {day.totalPlannedMinutes}m • {day.completedTasksCount}/{day.totalTasksCount}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Planned Study Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {totalPlannedMinutes} <span className="text-xs font-normal text-slate-500">mins</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalPlannedMinutes / dailyTargetMinutes) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {totalPlannedMinutes >= dailyTargetMinutes
              ? '🎯 Target duration planned!'
              : `${dailyTargetMinutes - totalPlannedMinutes}m below daily target`}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Completed Study Time</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {completedMinutes} <span className="text-xs font-normal text-slate-500">mins</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {progressPercent}% of planned study blocks completed
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Session Completion</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {completedCount} <span className="text-xs font-normal text-slate-500">/ {tasks.length} sessions</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {tasks.length - completedCount} session(s) pending
          </p>
        </div>
      </div>

      {/* Main Study Plan Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Study Tasks List (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Study Sessions & Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasks scheduled for {new Date(selectedDate + 'T00:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Study Block</span>
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                No study sessions scheduled for this day
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Schedule study sessions by importing your pending assignments or adding custom practice topics.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule First Session</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task, idx) => (
                <div
                  key={task._id || idx}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    task.isCompleted
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          task.isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {task.subject}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.plannedMinutes} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        task.isCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {task.isCompleted ? 'Done' : 'Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove from plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              disabled={saving}
              onClick={handleSavePlan}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Schedule Changes'}</span>
            </button>
          </div>
        </div>

        {/* Right: Daily Study Notes & Quick Import */}
        <div className="space-y-6">
          {/* Notes Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily Study Notes & Goals</span>
            </h3>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down learning goals, formulas to memorize, or notes on difficult topics..."
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSavePlan}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Update Daily Notes
            </button>
          </div>

          {/* Quick Import Card */}
          {pendingAssignments.length > 0 && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Assignments Quick-Add
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click to add an assignment directly into today's study plan.
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pendingAssignments.slice(0, 5).map((a) => (
                  <button
                    type="button"
                    key={a._id}
                    onClick={() => {
                      const newTask = {
                        assignment: a._id,
                        title: `Study: ${a.title}`,
                        subject: a.subject,
                        plannedMinutes: 45,
                        completedMinutes: 0,
                        isCompleted: false,
                      };
                      setPlan({
                        ...plan,
                        plannedTasks: [...(plan?.plannedTasks || []), newTask],
                      });
                      showToast(`Added "${a.title}" to schedule!`, 'info');
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-xs transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 dark:text-white truncate">
                        {a.title}
                      </p>
                      <p className="text-[10px] text-slate-400">{a.subject}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Study Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scale-up">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Schedule New Study Block</span>
            </h2>

            <form onSubmit={handleAddSession} className="space-y-3.5">
              {pendingAssignments.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Link to Assignment (Optional)
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => handleSelectAssignmentForSession(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose an assignment or enter custom topic --</option>
                    {pendingAssignments.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.subject}: {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Topic / Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Read Chapter 5 Data Structures"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subject / Course
                  </label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. CS101"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Duration (Minutes)
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="15">15 mins</option>
                    <option value="25">25 mins (1 Pomodoro)</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins (1 hour)</option>
                    <option value="90">90 mins</option>
                    <option value="120">120 mins (2 hours)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

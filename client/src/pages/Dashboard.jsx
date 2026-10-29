import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { taskService } from '../services/taskService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const outletContext = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    upcoming: 0,
  });

  // Edit / Delete state
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await taskService.getTasks({ sort: 'dueDateAsc' });
      if (res.success) {
        setTasks(res.tasks || []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchDashboardData();

    // Listen to global changes triggered from Navbar or other pages
    const handleDataChanged = () => {
      fetchDashboardData();
    };

    window.addEventListener('taskflow-data-changed', handleDataChanged);
    return () => window.removeEventListener('taskflow-data-changed', handleDataChanged);
  }, [fetchDashboardData]);

  // Status toggle
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      showSuccess(`Status changed to ${newStatus}`);
      fetchDashboardData();
    } catch (err) {
      showError(err.message || 'Failed to update status');
    }
  };

  // Edit submission
  const handleEditSubmit = async (formData) => {
    try {
      setIsSubmittingEdit(true);
      await taskService.updateTask(editingTask._id, formData);
      showSuccess('Assignment updated successfully!');
      setIsEditModalOpen(false);
      setEditingTask(null);
      fetchDashboardData();
    } catch (err) {
      showError(err.message || 'Failed to update assignment');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete submission
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      await taskService.deleteTask(taskToDelete._id);
      showSuccess('Assignment deleted successfully');
      setTaskToDelete(null);
      fetchDashboardData();
    } catch (err) {
      showError(err.message || 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Upcoming deadlines: non-completed tasks sorted by due date
  const upcomingDeadlines = tasks
    .filter((t) => t.status !== 'Completed')
    .slice(0, 4);

  // Recent assignments: 4 most recently added/updated tasks
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt))
    .slice(0, 4);

  // Completion Percentage calculation
  const completionPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg shadow-indigo-950/20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Student Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'Student'}! 👋
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-xl">
            Here is your academic progress snapshot. Stay on top of coursework assignments,
            subject topics, and upcoming submission deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh dashboard"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => outletContext?.onOpenNewTaskModal?.()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
          </button>
        </div>
      </div>

      {/* 6 Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        <StatCard
          title="Total"
          value={stats.total}
          icon={BookOpen}
          color="blue"
          subtitle="All recorded tasks"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          color="amber"
          subtitle="Yet to start"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={TrendingUp}
          color="indigo"
          subtitle="Actively working"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Finished tasks"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          color="rose"
          subtitle={stats.overdue > 0 ? 'Requires attention' : 'Clean sheet!'}
        />
        <StatCard
          title="Upcoming"
          value={stats.upcoming}
          icon={Calendar}
          color="slate"
          subtitle="Due in future"
        />
      </div>

      {/* Overall Completion Progress Bar */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Semester Completion Rate
            </h2>
          </div>
          <span className="text-sm font-bold text-blue-600">
            {completionPercentage}% Complete
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{stats.completed} assignments done</span>
          <span>{stats.total - stats.completed} remaining</span>
        </div>
      </div>

      {/* Main Sections: Upcoming Deadlines & Recent Assignments */}
      {loading ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4">
            <div className="h-5 bg-slate-200 rounded w-1/3"></div>
            <div className="h-24 bg-slate-100 rounded-xl"></div>
            <div className="h-24 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4">
            <div className="h-5 bg-slate-200 rounded w-1/3"></div>
            <div className="h-24 bg-slate-100 rounded-xl"></div>
            <div className="h-24 bg-slate-100 rounded-xl"></div>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        /* Friendly Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No assignments recorded yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            Start organizing your semester by adding your first coursework, homework, or project assignment.
          </p>
          <button
            type="button"
            onClick={() => outletContext?.onOpenNewTaskModal?.()}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Assignment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Deadlines Column */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Upcoming Deadlines
                </h2>
              </div>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-900">
                  All caught up!
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  You have no pending assignments with upcoming deadlines.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {upcomingDeadlines.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={(t) => setTaskToDelete(t)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Recent Assignments Column */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Recent Activity
                </h2>
              </div>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>Manage all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {recentTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={(t) => {
                    setEditingTask(t);
                    setIsEditModalOpen(true);
                  }}
                  onDelete={(t) => setTaskToDelete(t)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Edit Assignment Modal */}
      <TaskForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleEditSubmit}
        initialTask={editingTask}
        isSubmitting={isSubmittingEdit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        title="Delete Assignment"
        message={`Are you sure you want to permanently delete "${taskToDelete?.title}"? This cannot be undone.`}
        confirmText="Delete Assignment"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};

export default Dashboard;


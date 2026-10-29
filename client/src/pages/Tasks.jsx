import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, BookOpen, SearchX, RefreshCw } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import TaskFilters from '../components/TaskFilters';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { taskService } from '../services/taskService';
import { useToast } from '../context/ToastContext';

const Tasks = () => {
  const { showSuccess, showError } = useToast();
  const outletContext = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);

  // Filter & Sort States
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [sort, setSort] = useState('dueDateAsc');

  // Edit / Delete / Create Modal States
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch user's tasks with backend ownership enforcement
      const res = await taskService.getTasks();
      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTasks();

    const handleDataChanged = () => fetchTasks();
    window.addEventListener('taskflow-data-changed', handleDataChanged);
    return () => window.removeEventListener('taskflow-data-changed', handleDataChanged);
  }, [fetchTasks]);

  // Extract distinct subjects for the subject filter
  const subjectsList = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Client-side filtering & sorting for instant, responsive user interaction
  const filteredTasks = useMemo(() => {
    const now = new Date();

    return tasks
      .filter((task) => {
        // Search filter
        if (search.trim() !== '') {
          const q = search.toLowerCase();
          const matchesTitle = task.title?.toLowerCase().includes(q);
          const matchesSubject = task.subject?.toLowerCase().includes(q);
          const matchesDesc = task.description?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesSubject && !matchesDesc) return false;
        }

        // Subject filter
        if (subject !== 'All' && task.subject !== subject) {
          return false;
        }

        // Status filter
        if (status !== 'All') {
          if (status === 'Overdue') {
            const isTaskOverdue =
              task.status !== 'Completed' && new Date(task.dueDate).getTime() < now.getTime();
            if (!isTaskOverdue) return false;
          } else if (task.status !== status) {
            return false;
          }
        }

        // Priority filter
        if (priority !== 'All' && task.priority !== priority) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === 'dueDateAsc') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sort === 'dueDateDesc') {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sort === 'titleAsc') {
          return a.title.localeCompare(b.title);
        }
        if (sort === 'createdAtDesc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [tasks, search, subject, status, priority, sort]);

  const handleResetFilters = () => {
    setSearch('');
    setSubject('All');
    setStatus('All');
    setPriority('All');
    setSort('dueDateAsc');
  };

  // Status Change Handler
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      showSuccess(`Status changed to ${newStatus}`);
      fetchTasks();
    } catch (err) {
      showError(err.message || 'Failed to update status');
    }
  };

  // Edit Submit Handler
  const handleEditSubmit = async (formData) => {
    try {
      setIsSubmittingEdit(true);
      await taskService.updateTask(editingTask._id, formData);
      showSuccess('Assignment updated successfully!');
      setIsEditModalOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      showError(err.message || 'Failed to update assignment');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Confirm Handler
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      await taskService.deleteTask(taskToDelete._id);
      showSuccess('Assignment deleted successfully');
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      showError(err.message || 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assignments & Coursework
          </h1>
          <p className="text-sm text-slate-500">
            Search, filter, and track all your academic assignments in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTasks}
            title="Reload assignments"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => outletContext?.onOpenNewTaskModal?.()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        subject={subject}
        onSubjectChange={setSubject}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        sort={sort}
        onSortChange={setSort}
        onResetFilters={handleResetFilters}
        subjectsList={subjectsList}
        totalCount={tasks.length}
        filteredCount={filteredTasks.length}
      />

      {/* Assignment Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-3"
            >
              <div className="flex justify-between">
                <div className="h-5 bg-slate-200 rounded w-20"></div>
                <div className="h-5 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-12 bg-slate-100 rounded"></div>
              <div className="h-8 bg-slate-200 rounded pt-3"></div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        /* Empty state: No tasks at all */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No assignments recorded yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            Click "+ Add Assignment" to record your coursework, readings, and projects.
          </p>
          <button
            type="button"
            onClick={() => outletContext?.onOpenNewTaskModal?.()}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        /* Empty state: Filters produced 0 matches */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mb-4">
            <SearchX className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No matching assignments found
          </h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            Try adjusting your search keywords, clearing selected filters, or resetting the filter view.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
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

export default Tasks;


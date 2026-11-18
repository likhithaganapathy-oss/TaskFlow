import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  Plus,
  Search,
  Filter,
  User,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  RefreshCw,
  SearchX,
  X,
  RotateCcw,
  Globe,
  UserCheck,
  Award,
  Users,
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import GradingModal from '../../components/GradingModal';
import { adminService } from '../../services/adminService';
import { formatDisplayDate, getDueStatusInfo } from '../../components/TaskCard';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = ['Homework', 'Lab Report', 'Project', 'Essay', 'Exam Prep'];

const AdminTasks = () => {
  const { showSuccess, showError } = useToast();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);

  // Filters
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('studentId') || 'All');
  const [selectedScope, setSelectedScope] = useState('All');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [priority, setPriority] = useState('All');
  const [sort, setSort] = useState('dueDateAsc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Faculty Grading Modal state (Feature 5)
  const [gradingTask, setGradingTask] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    scope: 'all',
    studentId: '',
    title: '',
    subject: 'Computer Science',
    category: 'Homework',
    maxMarks: 100,
    isGroup: false,
    description: '',
    dueDate: '',
    priority: 'Medium',
    status: 'Pending',
  });

  const fetchTasksAndStudents = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, studentsRes] = await Promise.all([
        adminService.getAllTasks({
          studentId: selectedStudent,
          scope: selectedScope,
          search,
          subject,
          priority,
          sort,
        }),
        adminService.getStudents(),
      ]);

      if (tasksRes.success) setTasks(tasksRes.tasks || []);
      if (studentsRes.success) setStudents(studentsRes.students || []);
    } catch (err) {
      showError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, selectedScope, search, subject, priority, sort, showError]);

  useEffect(() => {
    fetchTasksAndStudents();
  }, [fetchTasksAndStudents]);

  // Extract unique subjects
  const subjectsList = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 3);
    const y = defaultDue.getFullYear();
    const m = String(defaultDue.getMonth() + 1).padStart(2, '0');
    const d = String(defaultDue.getDate()).padStart(2, '0');

    setFormData({
      scope: 'all',
      studentId: students.length > 0 ? students[0]._id : '',
      title: '',
      subject: 'Computer Science',
      category: 'Homework',
      maxMarks: 100,
      isGroup: false,
      description: '',
      dueDate: `${y}-${m}-${d}`,
      priority: 'Medium',
      status: 'Pending',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    const d = new Date(task.dueDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    setFormData({
      scope: task.scope === 'all' ? 'all' : 'individual',
      studentId: task.assignedTo?._id || task.user?._id || (students.length > 0 ? students[0]._id : ''),
      title: task.title,
      subject: task.subject,
      category: task.category || 'Homework',
      maxMarks: task.maxMarks || 100,
      isGroup: task.isGroup || false,
      description: task.description || '',
      dueDate: `${y}-${m}-${day}`,
      priority: task.priority,
      status: task.status || 'Pending',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return showError('Assignment title is required');
    if (!formData.subject.trim()) return showError('Subject is required');
    if (!formData.dueDate) return showError('Due date is required');

    if (formData.scope === 'individual' && !formData.studentId) {
      return showError('Please select a student for individual assignment');
    }

    try {
      setIsSubmitting(true);
      const [year, month, day] = formData.dueDate.split('-').map(Number);
      const resolvedDueDate = new Date(year, month - 1, day, 23, 59, 59).toISOString();

      const payload = {
        scope: formData.scope,
        studentId: formData.scope === 'individual' ? formData.studentId : undefined,
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        category: formData.category,
        maxMarks: Number(formData.maxMarks) || 100,
        isGroup: Boolean(formData.isGroup),
        description: formData.description.trim(),
        dueDate: resolvedDueDate,
        priority: formData.priority,
        status: formData.status,
      };

      if (editingTask) {
        await adminService.updateTask(editingTask._id, payload);
        showSuccess('Assignment updated successfully!');
      } else {
        await adminService.createTaskForStudent(payload);
        showSuccess(
          formData.scope === 'all'
            ? 'Institution-wide assignment published to all students!'
            : 'Assignment assigned to student successfully!'
        );
      }
      setIsModalOpen(false);
      fetchTasksAndStudents();
    } catch (err) {
      showError(err.message || 'Failed to save assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      await adminService.deleteTask(taskToDelete._id);
      showSuccess('Assignment removed from campus catalogue.');
      setTaskToDelete(null);
      fetchTasksAndStudents();
    } catch (err) {
      showError(err.message || 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedStudent('All');
    setSelectedScope('All');
    setSearch('');
    setSubject('All');
    setPriority('All');
    setSort('dueDateAsc');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              Faculty Console
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Institutional Coursework & Evaluation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Publish campus assignments, evaluate student submissions, and assign rubric marks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTasksAndStudents}
            title="Reload assignments"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md shadow-purple-500/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assignments by title or student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              Total: <strong className="text-slate-800 dark:text-white">{tasks.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Student Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Enrolled Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Students</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Scope Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Target Scope
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="all">Institution-wide</option>
              <option value="individual">Individual Student</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="dueDateAsc">Earliest Due</option>
              <option value="dueDateDesc">Latest Due</option>
              <option value="titleAsc">Title A-Z</option>
              <option value="createdAtDesc">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              <div className="h-7 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
              <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No matching assignments found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new assignment for enrolled students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const dueInfo = getDueStatusInfo(task.dueDate, 'Pending');
            const isInstitutionWide = task.scope === 'all';
            const isIndividual = task.scope === 'individual';

            return (
              <div
                key={task._id}
                className="relative flex flex-col justify-between p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <div>
                  {/* Top Scope Badge & Audience */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-700/80">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isInstitutionWide ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Globe className="w-3 h-3" />
                          Institution
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <UserCheck className="w-3 h-3" />
                          Individual
                        </span>
                      )}

                      {task.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {task.category}
                        </span>
                      )}

                      {task.isGroup && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Users className="w-3 h-3" />
                          Group
                        </span>
                      )}
                    </div>

                    {/* Assigned Student / Audience */}
                    <div className="text-right text-xs text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                      {isInstitutionWide ? (
                        <span className="font-medium text-purple-700 dark:text-purple-300">All Students</span>
                      ) : (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {task.assignedTo?.name || task.user?.name || 'Student'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject & Priority Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                      {task.subject}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                          task.priority === 'High'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : task.priority === 'Medium'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                      {dueInfo.isOverdue && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-bold animate-pulse">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug mb-1.5">
                    {task.title}
                  </h3>
                  {task.description ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 whitespace-pre-line">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4">No notes provided.</p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDisplayDate(task.dueDate)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Faculty Evaluate / Grade Button (Feature 5) */}
                    <button
                      type="button"
                      onClick={() => setGradingTask(task)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                      title="Grade and evaluate student submissions"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Evaluate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(task)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-slate-700"
                      title="Edit Assignment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700"
                      title="Delete Assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Faculty Grading Modal (Feature 5) */}
      {gradingTask && (
        <GradingModal
          isOpen={!!gradingTask}
          onClose={() => setGradingTask(null)}
          task={gradingTask}
          onGraded={() => {
            fetchTasksAndStudents();
          }}
        />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingTask ? 'Edit Coursework' : 'Create Coursework'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage institutional assignments, categories, and max marks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Assignment Scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assignment Audience <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scope: 'all' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.scope === 'all'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>All Students</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scope: 'individual' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.scope === 'individual'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Individual Student</span>
                  </button>
                </div>
              </div>

              {/* Target Student Selector */}
              {formData.scope === 'individual' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Designated Student <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="" disabled>Select an enrolled student...</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Distributed Systems Lab Project"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Subject & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category (Feature 9)
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Max Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Marks (Rubric)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Priority & Group Assignment Checkbox */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.isGroup}
                      onChange={(e) => setFormData({ ...formData, isGroup: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                    <span>Collaborative Group Project</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Instructions for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
                >
                  {editingTask ? 'Save Changes' : formData.scope === 'all' ? 'Publish to All Students' : 'Assign to Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        title="Delete Institutional Assignment"
        message={`Are you sure you want to permanently delete "${taskToDelete?.title}"? This will remove the assignment for all associated students.`}
        confirmText="Delete Assignment"
        isConfirming={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};

export default AdminTasks;

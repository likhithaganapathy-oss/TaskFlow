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
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { adminService } from '../../services/adminService';
import { formatDisplayDate, getDueStatusInfo } from '../../components/TaskCard';
import { useToast } from '../../context/ToastContext';

const AdminTasks = () => {
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Form State
  const [formData, setFormData] = useState({
    scope: 'all', // 'all' (Institution-wide) or 'individual' (Individual Student)
    studentId: '',
    title: '',
    subject: 'Computer Science',
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
      showSuccess('Assignment deleted successfully.');
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
    setSearchParams({});
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide">
              Faculty / Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Institutional Assignment Management
          </h1>
          <p className="text-sm text-slate-500">
            Publish coursework to all students or assign targeted tasks to individual students.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTasksAndStudents}
            title="Refresh list"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Top search & counter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assignments by title or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
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

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Total: <strong className="text-slate-800">{tasks.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {/* Scope Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Assignment Type
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="all">Institution-wide</option>
              <option value="individual">Individual Student</option>
              <option value="personal">Student Personal</option>
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Filter Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                setSearchParams(e.target.value !== 'All' ? { studentId: e.target.value } : {});
              }}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Students</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Subjects</option>
              {subjectsList.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
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
            <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3"></div>
              <div className="h-7 bg-slate-100 rounded"></div>
              <div className="h-10 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No matching assignments found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new assignment for enrolled students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const dueInfo = getDueStatusInfo(task.dueDate, 'Pending');
            const isInstitutionWide = task.scope === 'all';
            const isIndividual = task.scope === 'individual';
            const isPersonal = task.scope === 'personal';

            return (
              <div
                key={task._id}
                className="relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <div>
                  {/* Top Scope Badge & Audience */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {isInstitutionWide ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                          <Globe className="w-3 h-3" />
                          Institution-wide
                        </span>
                      ) : isIndividual ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                          <UserCheck className="w-3 h-3" />
                          Individual Student
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <User className="w-3 h-3" />
                          Student Personal
                        </span>
                      )}
                    </div>

                    {/* Assigned Student / Audience */}
                    <div className="text-right text-xs text-slate-600 truncate max-w-[150px]">
                      {isInstitutionWide ? (
                        <span className="font-medium text-purple-700">All Students</span>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {task.assignedTo?.name || task.user?.name || 'Assigned Student'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject & Priority Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                      {task.subject}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                          task.priority === 'High'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : task.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                  <h3 className="text-base font-semibold text-slate-900 leading-snug mb-1.5">
                    {task.title}
                  </h3>
                  {task.description ? (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 whitespace-pre-line">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4">No notes provided.</p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDisplayDate(task.dueDate)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(task)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors ml-1"
                      title="Edit Assignment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTask ? 'Edit Assignment' : 'Create Assignment'}
                </h2>
                <p className="text-xs text-slate-500">
                  Manage institutional coursework scope and deadlines
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Assignment Scope Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assignment Type / Audience <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scope: 'all' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.scope === 'all'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                        ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Individual Student</span>
                  </button>
                </div>
              </div>

              {/* Target Student Selector - ONLY displayed when scope is 'individual' */}
              {formData.scope === 'individual' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designated Student <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Distributed Systems Final Milestone"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Subject & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Instructions for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all"
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

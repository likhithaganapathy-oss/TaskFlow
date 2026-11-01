import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Plus,
  GraduationCap,
  Globe,
  UserCheck,
  X,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

const COMMON_SUBJECTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Software Engineering',
  'Database Systems',
  'Algorithms',
  'English & Writing',
  'Economics',
];

const AdminDashboard = () => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  // Assignment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scope: 'all', // 'all' (All Students) or 'individual' (Particular Student)
    studentId: '',
    title: '',
    subject: 'Computer Science',
    customSubject: '',
    description: '',
    dueDate: '',
    priority: 'Medium',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchAdminStats = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, studentsRes] = await Promise.all([
        adminService.getStats(),
        adminService.getStudents(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        setRecentStudents(statsRes.recentStudents || []);
      }
      if (studentsRes.success) {
        setAllStudents(studentsRes.students || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to load institutional metrics');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  const openAssignModal = (scope = 'all', studentId = '') => {
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 3);
    const y = defaultDue.getFullYear();
    const m = String(defaultDue.getMonth() + 1).padStart(2, '0');
    const d = String(defaultDue.getDate()).padStart(2, '0');

    // Default target student if selecting individual
    let targetStudentId = studentId;
    if (!targetStudentId && allStudents.length > 0) {
      targetStudentId = allStudents[0]._id;
    }

    setFormData({
      scope,
      studentId: targetStudentId,
      title: '',
      subject: 'Computer Science',
      customSubject: '',
      description: '',
      dueDate: `${y}-${m}-${d}`,
      priority: 'Medium',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Assignment title is required';
    }
    const finalSubject =
      formData.subject === 'Other' ? formData.customSubject.trim() : formData.subject.trim();
    if (!finalSubject) {
      errors.subject = 'Subject is required';
    }
    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    if (formData.scope === 'individual' && !formData.studentId) {
      errors.studentId = 'Please select a student to assign to';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const finalSubject =
        formData.subject === 'Other' ? formData.customSubject.trim() : formData.subject.trim();

      const payload = {
        scope: formData.scope,
        studentId: formData.scope === 'individual' ? formData.studentId : undefined,
        title: formData.title.trim(),
        subject: finalSubject,
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        priority: formData.priority,
      };

      const res = await adminService.createTaskForStudent(payload);
      if (res.success) {
        showSuccess(
          formData.scope === 'all'
            ? 'Assignment successfully assigned to all students!'
            : 'Assignment successfully assigned to the selected student!'
        );
        setIsModalOpen(false);
        fetchAdminStats();
      }
    } catch (err) {
      showError(err.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg shadow-purple-950/20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-2 border border-purple-400/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Institutional Administrator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Campus TaskFlow Overview
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-xl">
            Monitor student engagement, oversee academic coursework, and assign assignments to all students or specific individuals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAdminStats}
            title="Refresh statistics"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Option 1: Assign to All Students */}
          <button
            type="button"
            onClick={() => openAssignModal('all')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Globe className="w-4 h-4" />
            <span>Assign to All Students</span>
          </button>

          {/* Option 2: Assign to Particular Student */}
          <button
            type="button"
            onClick={() => openAssignModal('individual')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <UserCheck className="w-4 h-4" />
            <span>Assign to Particular Student</span>
          </button>
        </div>
      </div>

      {/* 6 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        <StatCard
          title="Students"
          value={stats.totalStudents}
          icon={Users}
          color="indigo"
          subtitle="Enrolled accounts"
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={BookOpen}
          color="blue"
          subtitle="Across all courses"
        />
        <StatCard
          title="Pending"
          value={stats.pendingTasks}
          icon={Clock}
          color="amber"
          subtitle="Yet to be started"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressTasks}
          icon={TrendingUp}
          color="slate"
          subtitle="Active student work"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Successfully finished"
        />
        <StatCard
          title="Overdue"
          value={stats.overdueTasks}
          icon={AlertTriangle}
          color="rose"
          subtitle={stats.overdueTasks > 0 ? 'Past deadline' : 'Zero overdue!'}
        />
      </div>

      {/* Institutional Completion Rate */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Campus-wide Assignment Completion Rate
            </h2>
          </div>
          <span className="text-sm font-bold text-purple-600">
            {stats.completionRate}% Done
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{stats.completedTasks} completed assignments</span>
          <span>{(stats.pendingTasks || 0) + (stats.inProgressTasks || 0)} in queue or progress</span>
        </div>
      </div>

      {/* Quick Access & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Student Signups */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Recently Registered Students
              </h2>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
            >
              <span>Manage all accounts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-12 bg-slate-100 rounded-xl"></div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
            </div>
          ) : recentStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No students registered yet</p>
              <p className="text-xs text-slate-500 mt-1">Students will appear here once they sign up via the register portal.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentStudents.map((student) => (
                <div
                  key={student._id}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-xl transition-colors gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs uppercase">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openAssignModal('individual', student._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Joined {new Date(student.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Admin Actions & Direct Options */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">
              Assignment & Coursework Options
            </h2>
          </div>

          <div className="space-y-2.5">
            {/* Quick Button: Assign to All */}
            <button
              type="button"
              onClick={() => openAssignModal('all')}
              className="w-full text-left p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">
                    Assign to All Students
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-6.5">
                Broadcast coursework institution-wide across all active students
              </p>
            </button>

            {/* Quick Button: Assign to Particular */}
            <button
              type="button"
              onClick={() => openAssignModal('individual')}
              className="w-full text-left p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
                    Assign to a Particular Student
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-6.5">
                Target a specific enrolled student with customized coursework
              </p>
            </button>

            <Link
              to="/admin/tasks"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all group"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">
                  View All Assignments Feed
                </p>
                <p className="text-xs text-slate-500">
                  Inspect submissions, status metrics, and deadlines
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Assignment Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Assign New Coursework
                </h2>
                <p className="text-xs text-slate-500">
                  Select your audience and configure coursework parameters
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

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
              {/* Audience Scope Selector: All vs Particular Student */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Audience Scope <span className="text-rose-500">*</span>
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
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Particular Student</span>
                  </button>
                </div>
              </div>

              {/* Target Student Dropdown - Only if Particular Student is chosen */}
              {formData.scope === 'individual' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Student <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.studentId ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  >
                    <option value="" disabled>Choose a student...</option>
                    {allStudents.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                  {formErrors.studentId && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{formErrors.studentId}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Distributed Consensus Lab 3"
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    formErrors.title ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{formErrors.title}</span>
                  </p>
                )}
              </div>

              {/* Subject & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject / Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {COMMON_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        formErrors.dueDate ? 'border-rose-400' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {formErrors.dueDate && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{formErrors.dueDate}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Custom Subject Field */}
              {formData.subject === 'Other' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Subject Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customSubject}
                    onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                    placeholder="Enter custom course name"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                        formData.priority === p
                          ? p === 'High'
                            ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold ring-2 ring-rose-500/20'
                            : p === 'Medium'
                            ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold ring-2 ring-amber-500/20'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed submission requirements or grading rubrics..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>
                        {formData.scope === 'all'
                          ? 'Assign to All Students'
                          : 'Assign to Student'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

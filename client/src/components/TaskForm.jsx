import React, { useState, useEffect } from 'react';
import { X, Calendar, BookOpen, AlertCircle, Loader2 } from 'lucide-react';

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

// Helper to format Date into YYYY-MM-DD for standard <input type="date">
const toInputDateFormat = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TaskForm = ({ isOpen, onClose, onSubmit, initialTask = null, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    customSubject: '',
    description: '',
    dueDate: '',
    priority: 'Medium',
    status: 'Pending',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialTask) {
      const isCustom = !COMMON_SUBJECTS.includes(initialTask.subject);
      setFormData({
        title: initialTask.title || '',
        subject: isCustom ? 'Other' : initialTask.subject || '',
        customSubject: isCustom ? initialTask.subject || '' : '',
        description: initialTask.description || '',
        dueDate: toInputDateFormat(initialTask.dueDate),
        priority: initialTask.priority || 'Medium',
        status: initialTask.status || 'Pending',
      });
    } else {
      // Set default due date to 3 days from now
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 3);

      setFormData({
        title: '',
        subject: 'Computer Science',
        customSubject: '',
        description: '',
        dueDate: toInputDateFormat(defaultDue),
        priority: 'Medium',
        status: 'Pending',
      });
    }
    setErrors({});
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Assignment title is required';
    } else if (formData.title.length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters';
    }

    const finalSubject =
      formData.subject === 'Other' ? formData.customSubject.trim() : formData.subject.trim();
    if (!finalSubject) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const parsedDate = new Date(formData.dueDate);
      if (isNaN(parsedDate.getTime())) {
        newErrors.dueDate = 'Please select a valid date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalSubject =
      formData.subject === 'Other' ? formData.customSubject.trim() : formData.subject.trim();

    // Construct local midnight date to prevent timezone shift off-by-one errors
    const [year, month, day] = formData.dueDate.split('-').map(Number);
    const resolvedDueDate = new Date(year, month - 1, day, 23, 59, 59);

    const payload = {
      title: formData.title.trim(),
      subject: finalSubject,
      description: formData.description.trim(),
      dueDate: resolvedDueDate.toISOString(),
      priority: formData.priority,
      status: formData.status,
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialTask ? 'Edit Assignment' : 'Add New Assignment'}
            </h2>
            <p className="text-xs text-slate-500">
              {initialTask
                ? 'Update assignment details and deadlines'
                : 'Keep track of college coursework, homework, or projects'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="task-title" className="text-xs font-semibold text-slate-700">
                Assignment Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {formData.title.length}/120
              </span>
            </div>
            <input
              id="task-title"
              type="text"
              maxLength={120}
              placeholder="e.g. Implement Dijkstra's Algorithm in Python"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: null });
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.title ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
            />
            {errors.title && (
              <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Subject & Custom Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Course <span className="text-rose-500">*</span>
              </label>
              <select
                id="task-subject"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  if (errors.subject) setErrors({ ...errors, subject: null });
                }}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.subject ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                }`}
              >
                {COMMON_SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
                <option value="Other">+ Custom Subject...</option>
              </select>
            </div>

            {formData.subject === 'Other' ? (
              <div>
                <label htmlFor="custom-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="custom-subject"
                  type="text"
                  placeholder="e.g. Artificial Intelligence"
                  value={formData.customSubject}
                  onChange={(e) => {
                    setFormData({ ...formData, customSubject: e.target.value });
                    if (errors.subject) setErrors({ ...errors, subject: null });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.subject ? 'border-rose-300' : 'border-slate-200'
                  }`}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="task-due-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                    if (errors.dueDate) setErrors({ ...errors, dueDate: null });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.dueDate ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                  }`}
                />
              </div>
            )}
          </div>

          {/* If Custom Subject was chosen, show Due Date on a separate row */}
          {formData.subject === 'Other' && (
            <div>
              <label htmlFor="task-due-date-custom" className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="task-due-date-custom"
                type="date"
                value={formData.dueDate}
                onChange={(e) => {
                  setFormData({ ...formData, dueDate: e.target.value });
                  if (errors.dueDate) setErrors({ ...errors, dueDate: null });
                }}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dueDate ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                }`}
              />
            </div>
          )}

          {errors.subject && (
            <p className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.subject}
            </p>
          )}

          {errors.dueDate && (
            <p className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.dueDate}
            </p>
          )}

          {/* Priority & Status Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                {['Low', 'Medium', 'High'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      formData.priority === p
                        ? p === 'High'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : p === 'Medium'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                {['Pending', 'In Progress', 'Completed'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: s })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      formData.status === s
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'In Progress' ? 'In Prog.' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-description" className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="task-description"
              rows={3}
              placeholder="e.g. Include unit tests, write README documentation, and submit to Canvas by 11:59 PM."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-sm transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialTask ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;


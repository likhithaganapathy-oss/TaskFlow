import React from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileCheck,
  Award,
  Users,
  Globe,
  UserCheck,
  User,
  Download,
  MessageSquare,
} from 'lucide-react';

// Format date safely without timezone shift
export const formatDisplayDate = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Calculate days remaining or overdue
export const getDueStatusInfo = (dateInput, status) => {
  if (status === 'Completed') {
    return {
      isOverdue: false,
      label: 'Completed',
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    };
  }

  const target = new Date(dateInput);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      label: 'Due today',
      color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  } else if (diffDays === 1) {
    return {
      isOverdue: false,
      label: 'Due tomorrow',
      color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    };
  } else {
    return {
      isOverdue: false,
      label: `Due in ${diffDays} days`,
      color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    };
  }
};

const priorityStyles = {
  High: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-semibold',
  Medium: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-medium',
  Low: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-medium',
};

const categoryStyles = {
  Homework: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'Lab Report': 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  Project: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Essay: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  'Exam Prep': 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, onSubmitWork }) => {
  const dueInfo = getDueStatusInfo(task.dueDate, task.status);

  const handleQuickComplete = () => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    onStatusChange(task._id, newStatus);
  };

  const isInstitution = task.scope === 'all';
  const isIndividual = task.scope === 'individual';
  const isPersonal = task.scope === 'personal';
  const isOwner = task.isOwner !== false && isPersonal;

  const isSubmitted = task.submission && task.submission.submitted;
  const isGraded = task.grade && typeof task.grade.marks === 'number';

  return (
    <div
      className={`group relative flex flex-col justify-between p-5 bg-white dark:bg-slate-800/90 rounded-2xl border transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 ${
        task.status === 'Completed'
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-90'
          : dueInfo.isOverdue
          ? 'border-rose-200 dark:border-rose-800/80 shadow-sm shadow-rose-100/30'
          : 'border-slate-200 dark:border-slate-700/80 shadow-sm'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Subject */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[120px]">{task.subject}</span>
            </div>

            {/* Category */}
            {task.category && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  categoryStyles[task.category] || categoryStyles.Homework
                }`}
              >
                {task.category}
              </span>
            )}

            {/* Group Badge (Feature 8) */}
            {task.isGroup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Users className="w-3 h-3" />
                Group ({task.groupMembers?.length || 2})
              </span>
            )}

            {/* Scope Badge */}
            {isInstitution && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Globe className="w-3 h-3" />
                Campus
              </span>
            )}
            {isIndividual && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <UserCheck className="w-3 h-3" />
                Assigned
              </span>
            )}
            {isPersonal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <User className="w-3 h-3" />
                Personal
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
                priorityStyles[task.priority] || priorityStyles.Medium
              }`}
            >
              {task.priority} Priority
            </span>

            {/* Overdue Badge */}
            {dueInfo.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-600 text-white animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className={`text-base font-semibold leading-snug mb-2 transition-colors ${
            task.status === 'Completed'
              ? 'text-slate-400 dark:text-slate-500 line-through'
              : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
          }`}
        >
          {task.title}
        </h3>

        {/* Description */}
        {task.description ? (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-3 whitespace-pre-line">
            {task.description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-3">No additional instructions provided.</p>
        )}

        {/* Evaluation & Feedback Snippet (Feature 5) */}
        {isGraded && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Grade Awarded: {task.grade.marks} / {task.grade.maxMarks || 100}</span>
              </span>
              <span>{Math.round((task.grade.marks / (task.grade.maxMarks || 100)) * 100)}%</span>
            </div>
            {task.grade.feedback && (
              <div className="text-slate-600 dark:text-slate-400 flex items-start gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="italic line-clamp-2">"{task.grade.feedback}"</span>
              </div>
            )}
          </div>
        )}

        {/* Submission Details Snippet (Feature 3) */}
        {isSubmitted && (
          <div className="mb-3 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
              <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">{task.submission.fileName || 'Submitted Document'}</span>
            </div>
            {task.submission.fileData && (
              <a
                href={task.submission.fileData}
                download={task.submission.fileName || 'submission'}
                className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                title="Download your submission file"
              >
                <Download className="w-3 h-3" />
                <span>View</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Due Date, Submission / Status / Edit Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Due date */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatDisplayDate(task.dueDate)}
            </span>
          </div>

          <span
            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border font-medium ${dueInfo.color}`}
          >
            {dueInfo.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Submission button (Feature 3) */}
          {onSubmitWork && !isPersonal && (
            <button
              type="button"
              onClick={() => onSubmitWork(task)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isSubmitted
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                  : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitted ? 'Resubmit File' : 'Submit Work'}</span>
            </button>
          )}

          {/* Quick status dropdown */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleQuickComplete}
              title={task.status === 'Completed' ? 'Mark as Pending' : 'Mark as Completed'}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                task.status === 'Completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{task.status === 'Completed' ? 'Done' : 'Complete'}</span>
            </button>

            <select
              value={task.status}
              onChange={(e) => onStatusChange(task._id, e.target.value)}
              className="text-xs py-1.5 pl-2 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Edit / Delete actions for student's personal tasks */}
          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700"
                title="Edit assignment"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(task)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700"
                title="Delete assignment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

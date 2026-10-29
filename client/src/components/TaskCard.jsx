import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  Globe,
  UserCheck,
  User,
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
    return { isOverdue: false, label: 'Completed', color: 'text-emerald-600 bg-emerald-50' };
  }

  const target = new Date(dateInput);
  const now = new Date();
  // Strip hours to compare calendar days accurately
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      label: 'Due today',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  } else if (diffDays === 1) {
    return {
      isOverdue: false,
      label: 'Due tomorrow',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    };
  } else {
    return {
      isOverdue: false,
      label: `Due in ${diffDays} days`,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
    };
  }
};

const priorityStyles = {
  High: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
  const dueInfo = getDueStatusInfo(task.dueDate, task.status);

  const handleQuickComplete = () => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    onStatusChange(task._id, newStatus);
  };

  const isInstitution = task.scope === 'all';
  const isIndividual = task.scope === 'individual';
  const isPersonal = task.scope === 'personal';
  const isOwner = task.isOwner !== false && isPersonal;

  return (
    <div
      className={`group relative flex flex-col justify-between p-5 bg-white rounded-2xl border transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
        task.status === 'Completed'
          ? 'bg-slate-50/70 border-slate-200 opacity-90'
          : dueInfo.isOverdue
          ? 'border-rose-200/90 shadow-sm shadow-rose-100/50'
          : 'border-slate-200 shadow-sm shadow-slate-100'
      }`}
    >
      <div>
        {/* Top Badges: Subject, Scope, Priority, Overdue */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate max-w-[120px]">{task.subject}</span>
            </div>

            {/* Scope Badge */}
            {isInstitution && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <Globe className="w-3 h-3" />
                Institution
              </span>
            )}
            {isIndividual && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <UserCheck className="w-3 h-3" />
                Assigned
              </span>
            )}
            {isPersonal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
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

            {/* Overdue Badge if applicable */}
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
              ? 'text-slate-500 line-through'
              : 'text-slate-900 group-hover:text-blue-600'
          }`}
        >
          {task.title}
        </h3>

        {/* Description (if provided) */}
        {task.description ? (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4 whitespace-pre-line">
            {task.description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-4">No additional notes provided.</p>
        )}
      </div>

      {/* Card Footer: Due Date, Status Select, Edit/Delete Actions */}
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Due date and relative tag */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">
              {formatDisplayDate(task.dueDate)}
            </span>
          </div>

          <span
            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border font-medium ${dueInfo.color}`}
          >
            {dueInfo.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Status quick select / complete button */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleQuickComplete}
              title={task.status === 'Completed' ? 'Mark as Pending' : 'Mark as Completed'}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                task.status === 'Completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{task.status === 'Completed' ? 'Completed' : 'Mark Done'}</span>
            </button>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value)}
                className="text-xs py-1.5 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                title="Change status"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Action Buttons: Edit & Delete for personal assignments; note for instructor assignments */}
          <div className="flex items-center gap-1">
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  title="Edit assignment"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Edit assignment"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(task)}
                  title="Delete assignment"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                  aria-label="Delete assignment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span
                className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                title="Coursework managed by faculty"
              >
                Faculty
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

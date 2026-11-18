import React from 'react';
import { Search, Filter, RotateCcw, ArrowUpDown, X, Tag } from 'lucide-react';

const CATEGORIES = ['All', 'Homework', 'Lab Report', 'Project', 'Essay', 'Exam Prep'];

const TaskFilters = ({
  search,
  onSearchChange,
  subject,
  onSubjectChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  category = 'All',
  onCategoryChange,
  sort,
  onSortChange,
  onResetFilters,
  subjectsList = [],
  totalCount = 0,
  filteredCount = 0,
}) => {
  const isFiltered =
    search.trim() !== '' ||
    subject !== 'All' ||
    status !== 'All' ||
    priority !== 'All' ||
    (category && category !== 'All') ||
    sort !== 'dueDateAsc';

  return (
    <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-100 dark:shadow-none mb-6 space-y-3.5 transition-colors">
      {/* Top row: Search bar & Result counter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assignments by title, subject, or keywords..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Counter & Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredCount}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{totalCount}</strong>
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter controls row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {/* Subject Filter */}
        <div>
          <label htmlFor="filter-subject" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Subject
          </label>
          <select
            id="filter-subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Subjects</option>
            {subjectsList.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter (Feature 9) */}
        <div>
          <label htmlFor="filter-category" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            id="filter-category"
            value={category || 'All'}
            onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="filter-status" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue only</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label htmlFor="filter-priority" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Priority
          </label>
          <select
            id="filter-priority"
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="filter-sort" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Sort By
          </label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="dueDateAsc">Earliest Due Date</option>
            <option value="dueDateDesc">Latest Due Date</option>
            <option value="titleAsc">Title (A-Z)</option>
            <option value="createdAtDesc">Recently Created</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default TaskFilters;

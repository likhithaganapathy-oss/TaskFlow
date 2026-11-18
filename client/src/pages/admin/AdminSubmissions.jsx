import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  BookOpen,
  Filter,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminSubmissions() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, late, pending, completed

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getSubmissionOverview();
      if (res.success) {
        setData(res.overview || []);
      }
    } catch (err) {
      showError('Failed to load submission monitoring overview.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Aggregate high-level stats
  const totalStudents = data.length;
  const totalSubmissions = data.reduce((sum, item) => sum + (item.metrics.submitted || 0), 0);
  const totalLate = data.reduce((sum, item) => sum + (item.metrics.late || 0), 0);
  const totalPending = data.reduce((sum, item) => sum + (item.metrics.pending || 0), 0);

  const filtered = data.filter((item) => {
    const s = item.student;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'late') return item.metrics.late > 0;
    if (filterMode === 'pending') return item.metrics.pending > 0;
    if (filterMode === 'completed') return item.metrics.submitted > 0 && item.metrics.pending === 0;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 uppercase tracking-wide">
              Feature A4: Submission Monitoring
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            Submission Monitoring Console
            <FileCheck2 className="w-5 h-5 text-purple-600" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track submitted, pending, and overdue submissions across all enrolled student cohorts.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 shadow-sm"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-slate-400">Monitored Students</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalStudents}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Completed Submissions
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalSubmissions}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-amber-500">Pending Submissions</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalPending}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-rose-500">Overdue / Late Deliveries</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalLate}</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, email, roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Students' },
            { id: 'late', label: 'With Overdue / Late ⚠️' },
            { id: 'pending', label: 'Pending Work' },
            { id: 'completed', label: 'All Turned In ✅' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student Submissions Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-14 bg-slate-50 dark:bg-slate-700/60 rounded-xl"></div>
          <div className="h-14 bg-slate-50 dark:bg-slate-700/60 rounded-xl"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No submission records match filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try switching filters or clearing your search term.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Student</th>
                  <th className="py-3.5 px-4">Academic ID</th>
                  <th className="py-3.5 px-4 text-center">Assigned</th>
                  <th className="py-3.5 px-4 text-center">Submitted</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4 text-center">Overdue / Late</th>
                  <th className="py-3.5 px-4 text-center">Avg Grade</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                {filtered.map((item) => {
                  const s = item.student;
                  const m = item.metrics;
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎓</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-white leading-tight truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Academic ID */}
                      <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-white">
                          {s.rollNumber || 'Not registered'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {[s.branch, s.year ? `Yr ${s.year}` : '', s.section].filter(Boolean).join(' • ') || '—'}
                        </div>
                      </td>

                      {/* Assigned */}
                      <td className="py-4 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {m.totalAssigned}
                      </td>

                      {/* Submitted */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {m.submitted}
                        </span>
                      </td>

                      {/* Pending */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {m.pending}
                        </span>
                      </td>

                      {/* Late */}
                      <td className="py-4 px-4 text-center">
                        {m.late > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            {m.late} Late
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">0</span>
                        )}
                      </td>

                      {/* Avg Grade */}
                      <td className="py-4 px-4 text-center font-bold text-slate-800 dark:text-white">
                        {m.averageGradePercent !== null ? `${m.averageGradePercent}%` : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/tasks?studentId=${s._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>View Tasks</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

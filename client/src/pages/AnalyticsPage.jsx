import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  BookOpen,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  Flame,
  Loader2,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { Link } from 'react-router-dom';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await taskService.getAnalytics();
        setData(res.data?.analytics || res.analytics || null);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Calculating productivity metrics...
        </p>
      </div>
    );
  }

  const analytics = data || {
    totalAssignments: 0,
    completedCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    completionRate: 0,
    totalTimeMinutes: 0,
    totalPomodoroCount: 0,
    averageGrade: null,
    gradedAssignmentsCount: 0,
    subjectBreakdown: [],
    weeklyTrends: [],
  };

  const focusHours = (analytics.totalTimeMinutes / 60).toFixed(1);

  // Maximum value for weekly chart normalization
  const maxWeeklyCompleted = Math.max(
    3,
    ...(analytics.weeklyTrends || []).map((t) => t.completed)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Feature 6
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Live Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            Student Productivity Analytics
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track completion velocity, subject mastery, focus hours, and faculty evaluation scores.
          </p>
        </div>

        <Link
          to="/pomodoro"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Launch Focus Timer</span>
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Completion Velocity</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {analytics.completionRate}%
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ({analytics.completedCount}/{analytics.totalAssignments} tasks)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </div>

        {/* Study Hours & Pomodoro */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Focus Time</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {focusHours}h
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ({analytics.totalTimeMinutes} mins)
            </span>
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{analytics.totalPomodoroCount} Pomodoro intervals logged</span>
          </div>
        </div>

        {/* Academic Performance / Average Grade */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Average Grade</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {analytics.averageGrade !== null ? `${analytics.averageGrade}%` : 'N/A'}
            </span>
            {analytics.averageGrade !== null && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Grade: {analytics.averageGrade >= 90 ? 'A+' : analytics.averageGrade >= 80 ? 'A' : 'B'}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {analytics.gradedAssignmentsCount > 0
              ? `${analytics.gradedAssignmentsCount} evaluations recorded`
              : 'Awaiting faculty evaluation'}
          </div>
        </div>

        {/* Active & Overdue Backlog */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Backlog</span>
            <div
              className={`p-2 rounded-xl ${
                analytics.overdueCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {analytics.overdueCount > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {analytics.inProgressCount + analytics.pendingCount}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              in queue
            </span>
          </div>
          <div className="text-xs font-medium">
            {analytics.overdueCount > 0 ? (
              <span className="text-rose-600 dark:text-rose-400">
                ⚠️ {analytics.overdueCount} overdue assignment{analytics.overdueCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">
                ✓ No overdue assignments!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Completion Velocity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>7-Day Assignment Completion Velocity</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Number of assignments marked completed per day over the last week
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              Past 7 Days
            </span>
          </div>

          {/* Bar Chart Graphics */}
          <div className="pt-6 pb-2">
            <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {(analytics.weeklyTrends || []).map((t, idx) => {
                const heightPercent = Math.max(8, (t.completed / maxWeeklyCompleted) * 100);
                const isToday = idx === (analytics.weeklyTrends.length - 1);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.completed}
                    </div>
                    <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-700/50 rounded-t-xl h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ease-out ${
                          isToday
                            ? 'bg-blue-600 shadow-lg shadow-blue-500/30'
                            : t.completed > 0
                            ? 'bg-blue-400/80 dark:bg-blue-500/60 group-hover:bg-blue-500'
                            : 'bg-slate-200/60 dark:bg-slate-700/30'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-xs font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {t.day}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Lifecycle Breakdown */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>Workflow Lifecycle</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Feature 7: Real-time assignment lifecycle distribution
          </p>

          <div className="space-y-4 pt-2">
            {/* Completed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Completed
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {analytics.completedCount}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{
                    width: `${
                      analytics.totalAssignments > 0
                        ? (analytics.completedCount / analytics.totalAssignments) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* In Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  In Progress
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {analytics.inProgressCount}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${
                      analytics.totalAssignments > 0
                        ? (analytics.inProgressCount / analytics.totalAssignments) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Pending */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Pending
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {analytics.pendingCount}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${
                      analytics.totalAssignments > 0
                        ? (analytics.pendingCount / analytics.totalAssignments) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Mastery Breakdown */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Subject Progress & Completion Rate</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Coursework breakdown by academic module
            </p>
          </div>
        </div>

        {analytics.subjectBreakdown.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center">
            No subject data available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.subjectBreakdown.map((s, idx) => {
              const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {s.subject}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {s.completed} / {s.total} Done ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

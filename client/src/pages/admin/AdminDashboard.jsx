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
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

const AdminDashboard = () => {
  const { showError } = useToast();
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

  const fetchAdminStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getStats();
      if (res.success) {
        setStats(res.stats);
        setRecentStudents(res.recentStudents || []);
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
            Monitor student engagement, oversee academic coursework, and audit completion rates across departments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAdminStats}
            title="Refresh statistics"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Task</span>
          </Link>
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
                  className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-xl transition-colors"
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
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">
                      Joined {new Date(student.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Admin Actions & System Health */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">
              Admin Quick Actions
            </h2>
          </div>

          <div className="space-y-2.5">
            <Link
              to="/admin/users"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all group"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">
                  Manage Student Accounts
                </p>
                <p className="text-xs text-slate-500">
                  Search, review metrics, or remove student accounts
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </Link>

            <Link
              to="/admin/tasks"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all group"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">
                  Institutional Assignments Feed
                </p>
                <p className="text-xs text-slate-500">
                  Monitor, create, or update tasks across students
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </Link>

            <Link
              to="/dashboard"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                  Preview Student Dashboard
                </p>
                <p className="text-xs text-slate-500">
                  Switch to student portal view
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Trash2,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

const AdminUsers = () => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getStudents(search);
      if (res.success) {
        setStudents(res.students || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch student accounts');
    } finally {
      setLoading(false);
    }
  }, [search, showError]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      const res = await adminService.deleteStudent(studentToDelete._id);
      showSuccess(res.message || 'Student account deleted.');
      setStudentToDelete(null);
      fetchStudents();
    } catch (err) {
      showError(err.message || 'Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide">
              Admin Directory
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Registered Student Accounts
          </h1>
          <p className="text-sm text-slate-500">
            View student enrollment records, track individual workload metrics, or manage access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStudents}
            title="Refresh student list"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-2 rounded-xl shrink-0">
          Total: <strong className="text-slate-800">{students.length}</strong>
        </span>
      </div>

      {/* Student List Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-14 bg-slate-50 rounded-xl"></div>
          <div className="h-14 bg-slate-50 rounded-xl"></div>
          <div className="h-14 bg-slate-50 rounded-xl"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No student accounts found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'No registered students matched your search query.' : 'There are currently no students registered in the database.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Student</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4">Workload Metrics</th>
                  <th className="py-3.5 px-4">Completion</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {students.map((student) => {
                  const m = student.taskMetrics || { total: 0, completed: 0, overdue: 0, completionRate: 0 };
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold text-xs uppercase shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 leading-tight truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{student.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(student.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Workload */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                            {m.total} Tasks
                          </span>
                          {m.overdue > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              {m.overdue} Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Completion Rate */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${m.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">
                            {m.completionRate}%
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/tasks?studentId=${student._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                            title="Inspect student's assignments"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Tasks</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete student account"
                            aria-label="Delete student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        title="Delete Student Account"
        message={`Are you sure you want to permanently delete "${studentToDelete?.name}" (${studentToDelete?.email})? All assignments belonging to this student will also be removed immediately.`}
        confirmText="Delete Account"
        isConfirming={isDeleting}
        onConfirm={handleDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
};

export default AdminUsers;


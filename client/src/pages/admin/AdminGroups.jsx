import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Save,
  Check,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { groupService } from '../../services/groupService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminGroups() {
  const { showSuccess, showError } = useToast();
  const [groups, setGroups] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    members: [],
  });

  const fetchGroupsAndStudents = useCallback(async () => {
    try {
      setLoading(true);
      const [grpRes, stuRes] = await Promise.all([
        groupService.getGroups(),
        adminService.getStudents(),
      ]);

      if (grpRes.success) setGroups(grpRes.groups || []);
      if (stuRes.success) setAllStudents(stuRes.students || []);
    } catch (err) {
      showError('Failed to load group details.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchGroupsAndStudents();
  }, [fetchGroupsAndStudents]);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      department: '',
      members: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      description: group.description || '',
      department: group.department || '',
      members: group.members ? group.members.map((m) => m._id) : [],
    });
    setIsModalOpen(true);
  };

  const toggleStudentSelection = (studentId) => {
    const current = [...formData.members];
    const idx = current.indexOf(studentId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(studentId);
    }
    setFormData({ ...formData, members: current });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return showError('Group name is required.');
    }

    setIsSaving(true);
    try {
      if (editingGroup) {
        await groupService.updateGroup(editingGroup._id, formData);
        showSuccess(`Group "${formData.name}" updated!`);
      } else {
        await groupService.createGroup(formData);
        showSuccess(`Group "${formData.name}" created with ${formData.members.length} members!`);
      }
      setIsModalOpen(false);
      fetchGroupsAndStudents();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save group.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    try {
      await groupService.deleteGroup(groupToDelete._id);
      showSuccess(`Group "${groupToDelete.name}" deleted.`);
      setGroupToDelete(null);
      fetchGroupsAndStudents();
    } catch (err) {
      showError(err.message || 'Failed to delete group.');
    }
  };

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 uppercase tracking-wide">
              Feature A7: Group Assignment Management
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            Project & Study Groups
            <Users className="w-5 h-5 text-purple-600" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Form collaborative student teams, assign team projects, and coordinate joint coursework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
          </button>
          <button
            type="button"
            onClick={fetchGroupsAndStudents}
            title="Refresh groups"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams by group name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl shrink-0">
          Total Teams: <strong className="text-slate-800 dark:text-white">{filtered.length}</strong>
        </span>
      </div>

      {/* Group Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No project groups created</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No groups matched your search query.' : 'Click "Create Group" to assemble student teams.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <div
              key={group._id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {group.members?.length || 0} Members
                  </span>
                  {group.department && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {group.department}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}

                {/* Team Members Chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(group.members || []).slice(0, 4).map((m) => (
                    <span
                      key={m._id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                    >
                      <span>🎓</span>
                      <span className="truncate max-w-[100px]">{m.name}</span>
                    </span>
                  ))}
                  {(group.members?.length || 0) > 4 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/40">
                      +{group.members.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(group)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                  title="Edit Group"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGroupToDelete(group)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Delete Group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>{editingGroup ? 'Edit Group & Members' : 'Create Student Team'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Team / Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Capstone Alpha Team"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. CSE / IT"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Selected Members
                  </label>
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 py-2">
                    {formData.members.length} student(s) selected
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Description
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline the scope or objective of this group..."
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Student Multi-Select List */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Team Members (Click to toggle)
                </label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-900">
                  {allStudents.map((stu) => {
                    const isSelected = formData.members.includes(stu._id);
                    return (
                      <button
                        type="button"
                        key={stu._id}
                        onClick={() => toggleStudentSelection(stu._id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                          isSelected
                            ? 'bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800'
                            : 'hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span>🎓</span>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-white truncate">
                              {stu.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {stu.rollNumber || stu.email}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : editingGroup ? 'Update Team' : 'Create Team'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!groupToDelete}
        title="Delete Team Group"
        message={`Are you sure you want to delete group "${groupToDelete?.name}"?`}
        confirmText="Delete Group"
        onConfirm={handleDelete}
        onCancel={() => setGroupToDelete(null)}
      />
    </div>
  );
}

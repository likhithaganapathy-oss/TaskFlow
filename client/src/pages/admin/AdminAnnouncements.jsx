import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  CheckCircle2,
  Sparkles,
  Megaphone,
  Radio,
  Check,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminAnnouncements() {
  const { showSuccess, showError } = useToast();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all'); // 'all' or 'selected'
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    async function loadStudents() {
      try {
        setLoadingStudents(true);
        const res = await adminService.getStudents();
        if (res.success) {
          setStudents(res.students || []);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, []);

  const toggleStudent = (id) => {
    const current = [...selectedStudents];
    const idx = current.indexOf(id);
    if (idx > -1) current.splice(idx, 1);
    else current.push(id);
    setSelectedStudents(current);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return showError('Announcement title and message are required.');
    }
    if (targetType === 'selected' && selectedStudents.length === 0) {
      return showError('Please select at least one recipient student.');
    }

    setSending(true);
    try {
      const res = await adminService.sendAnnouncement({
        title: title.trim(),
        message: message.trim(),
        recipients: targetType === 'all' ? 'all' : selectedStudents,
      });

      showSuccess(res.message || 'Announcement broadcasted to students!');
      setTitle('');
      setMessage('');
      setSelectedStudents([]);
      setTargetType('all');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to dispatch announcement.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 uppercase tracking-wide">
            Feature A6: Campus Announcements
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
          Announcements & Alerts Broadcaster
          <Megaphone className="w-6 h-6 text-purple-600" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Broadcast official announcements directly to every student's Notification Center and portal dashboard.
        </p>
      </div>

      <form onSubmit={handleSend} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          {/* Target Audience Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-600" />
              <span>Recipient Audience</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  targetType === 'all'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-600/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    All Enrolled Students
                  </span>
                  {targetType === 'all' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Broadcasts to all {students.length} active registered student accounts.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('selected')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  targetType === 'selected'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-600/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Selected Students ({selectedStudents.length})
                  </span>
                  {targetType === 'selected' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Handpick specific students or section representatives.
                </p>
              </button>
            </div>
          </div>

          {/* Student Selector when 'selected' is active */}
          {targetType === 'selected' && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Recipient Students
              </label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-900">
                {students.map((stu) => {
                  const isSelected = selectedStudents.includes(stu._id);
                  return (
                    <button
                      type="button"
                      key={stu._id}
                      onClick={() => toggleStudent(stu._id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800'
                          : 'hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🎓</span>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-white">{stu.name}</div>
                          <div className="text-[10px] text-slate-400">{stu.rollNumber || stu.email}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Announcement Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Announcement Title / Headline *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Examination Schedule Released"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Announcement Message Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Message Content *
            </label>
            <textarea
              rows="5"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your official announcement here. Keep it clear, informative, and include any relevant deadlines or action items..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

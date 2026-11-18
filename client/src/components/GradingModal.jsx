import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Download,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';

const GradingModal = ({ isOpen, onClose, task, onGraded }) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      fetchSubmissions();
    }
  }, [isOpen, task]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSubmissions(task._id);
      if (res.success) {
        setSubmissions(res.submissions || []);
        if (res.submissions && res.submissions.length > 0) {
          selectStudentSubmission(res.submissions[0]);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to load student submissions');
    } finally {
      setLoading(false);
    }
  };

  const selectStudentSubmission = (sub) => {
    setSelectedSub(sub);
    setMarks(sub.grade?.marks !== null && sub.grade?.marks !== undefined ? sub.grade.marks : '');
    setFeedback(sub.grade?.feedback || '');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;

    if (marks === '' || isNaN(Number(marks))) {
      showError('Please enter valid numeric marks.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminService.gradeSubmission(task._id, {
        studentId: selectedSub.student._id,
        marks: Number(marks),
        maxMarks: task.maxMarks || 100,
        feedback,
      });

      if (res.success) {
        showSuccess(`Graded ${selectedSub.student.name}: ${marks}/${task.maxMarks || 100}`);
        // Update local list
        setSubmissions((prev) =>
          prev.map((s) =>
            s.student._id === selectedSub.student._id
              ? { ...s, grade: res.grade }
              : s
          )
        );
        setSelectedSub((prev) => ({ ...prev, grade: res.grade }));
        if (onGraded) onGraded();
        window.dispatchEvent(new Event('taskflow-data-changed'));
      }
    } catch (err) {
      showError(err.message || 'Failed to submit grade');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Faculty Evaluation Console
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Max Marks: {task.maxMarks || 100}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left sidebar students, Right sidebar grading form */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Student Roster */}
          <div className="md:col-span-1 overflow-y-auto p-3 space-y-1.5 max-h-[250px] md:max-h-[500px]">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Enrolled Students ({submissions.length})
            </p>

            {loading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-600" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">
                No students enrolled in this assignment yet.
              </p>
            ) : (
              submissions.map((sub) => {
                const isSelected = selectedSub?.student?._id === sub.student._id;
                const hasSubmitted = sub.submission?.submitted;
                const isGraded = sub.grade?.marks !== null && sub.grade?.marks !== undefined;

                return (
                  <button
                    key={sub._id}
                    type="button"
                    onClick={() => selectStudentSubmission(sub)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="truncate">{sub.student.name}</p>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {sub.student.email}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isGraded ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {sub.grade.marks}m
                        </span>
                      ) : hasSubmitted ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Submitted
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Grading Evaluation Pane */}
          <div className="md:col-span-2 p-6 overflow-y-auto space-y-5">
            {selectedSub ? (
              <>
                {/* Student Submission Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedSub.student.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Status:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {selectedSub.status}
                        </span>
                        {selectedSub.timeSpentMinutes > 0 &&
                          ` • ${selectedSub.timeSpentMinutes} mins focused study`}
                      </p>
                    </div>

                    {selectedSub.submission?.submitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submitted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>No File Uploaded</span>
                      </span>
                    )}
                  </div>

                  {selectedSub.submission?.submitted && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedSub.submission.fileName || 'Assignment Document'}
                          </span>
                        </div>

                        {selectedSub.submission.fileData && (
                          <a
                            href={selectedSub.submission.fileData}
                            download={
                              selectedSub.submission.fileName ||
                              `${selectedSub.student.name}_submission`
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 hover:bg-purple-200 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download File</span>
                          </a>
                        )}
                      </div>

                      {selectedSub.submission.notes && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                          <p className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                            Student Submission Remarks:
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap">
                            {selectedSub.submission.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grading Form */}
                <form onSubmit={handleSaveGrade} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Awarded Marks (Out of {task.maxMarks || 100}){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={task.maxMarks || 100}
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      placeholder="e.g. 95"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Faculty Constructive Feedback & Comments
                    </label>
                    <textarea
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g. Excellent methodology and code readability. Work on optimizing time complexity in section 2..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Evaluation...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        <span>Publish Marks & Feedback</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">Select a student from the left roster to evaluate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingModal;

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Download,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { useToast } from '../context/ToastContext';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const SubmissionModal = ({ isOpen, onClose, task, onSubmitted }) => {
  const { showSuccess, showError } = useToast();
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen || !task) return null;

  const existingSubmission = task.submission && task.submission.submitted ? task.submission : null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    processFile(selected);
  };

  const processFile = (selected) => {
    if (!selected) return;

    // 15MB max size limit
    if (selected.size > 15 * 1024 * 1024) {
      showError('File size exceeds the 15MB limit.');
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result);
    };
    reader.onerror = () => {
      showError('Failed to read file.');
    };
    reader.readAsDataURL(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    processFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileData && !notes.trim()) {
      showError('Please choose a file or enter submission notes.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await taskService.submitTask(task._id, {
        fileData: fileData || existingSubmission?.fileData,
        fileName: file ? file.name : existingSubmission?.fileName || 'Document',
        fileType: file ? file.type : existingSubmission?.fileType || 'application/pdf',
        fileSize: file ? file.size : existingSubmission?.fileSize || 0,
        notes,
      });

      if (res.success) {
        showSuccess('Assignment submitted successfully!');
        if (onSubmitted) onSubmitted();
        window.dispatchEvent(new Event('taskflow-data-changed'));
        onClose();
      }
    } catch (err) {
      showError(err.message || 'Failed to submit assignment');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {task.subject}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Max Marks: {task.maxMarks || 100}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug">
              Submit: {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Submission Banner */}
        {existingSubmission && (
          <div className="mx-6 mt-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Already Submitted
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                Submitted on{' '}
                {new Date(existingSubmission.submittedAt).toLocaleString()}
                {existingSubmission.fileName && ` • ${existingSubmission.fileName}`}
              </p>
              {existingSubmission.fileData && (
                <a
                  href={existingSubmission.fileData}
                  download={existingSubmission.fileName || 'submitted_assignment'}
                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold underline mt-1.5 hover:text-emerald-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Submitted File</span>
                </a>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drag & Drop Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Assignment Document (PDF, DOCX, PPTX, or Code)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.zip,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatFileSize(file.size)} • Click to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    PDF, Word (.docx), PowerPoint (.pptx), or ZIP up to 15MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submission Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Submission Notes / Remarks for Faculty (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please refer to Section 3 for implementation benchmarks..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {existingSubmission ? 'Resubmit Work' : 'Confirm Submission'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmissionModal;

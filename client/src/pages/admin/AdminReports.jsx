import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Users,
  BookOpen,
  FileCheck2,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminReports() {
  const { showSuccess, showError } = useToast();
  const [downloading, setDownloading] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState('students');

  // Convert array of objects to standard CSV string
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers
        .map((fieldName) => {
          const val = row[fieldName] !== null && row[fieldName] !== undefined ? String(row[fieldName]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    return [headers.join(','), ...rows].join('\r\n');
  };

  const triggerDownload = (filename, content, mimeType = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (type, format = 'csv') => {
    setDownloading(`${type}_${format}`);
    try {
      const res = await adminService.getReportData(type);
      if (!res.success || !res.data || res.data.length === 0) {
        return showError(`No data available to export for ${type} report.`);
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `TaskFlow_${type}_report_${timestamp}.${format === 'csv' ? 'csv' : 'xls'}`;

      if (format === 'csv') {
        const csv = convertToCSV(res.data);
        triggerDownload(filename, csv, 'text/csv;charset=utf-8;');
      } else {
        // Tab-delimited format which Excel opens cleanly as spreadsheet
        const headers = Object.keys(res.data[0]);
        const tsv = [
          headers.join('\t'),
          ...res.data.map((row) => headers.map((k) => row[k] || '').join('\t')),
        ].join('\n');
        triggerDownload(filename, tsv, 'application/vnd.ms-excel;charset=utf-8;');
      }

      showSuccess(`Exported ${res.data.length} records to ${filename}!`);
    } catch (err) {
      showError('Failed to generate report export.');
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (type) => {
    setPreviewType(type);
    try {
      const res = await adminService.getReportData(type);
      if (res.success) {
        setPreviewData(res.data || []);
      }
    } catch (err) {
      showError('Failed to load report preview.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 uppercase tracking-wide">
              Feature A2: Institutional Reports
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            Institutional Report Generator
            <FileSpreadsheet className="w-5 h-5 text-purple-600" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export official student rosters, assignment completion reports, and submission grading ledgers in Excel or PDF.
          </p>
        </div>

        {previewData && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        )}
      </div>

      {/* 3 Main Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Students */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Student Enrollment Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete student roster including roll numbers, academic branch, year, section, and account status.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={downloading === 'students_csv'}
                onClick={() => handleDownload('students', 'csv')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                disabled={downloading === 'students_xls'}
                onClick={() => handleDownload('students', 'xls')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handlePreview('students')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Preview on Screen
            </button>
          </div>
        </div>

        {/* Card 2: Assignments */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Coursework & Assignments
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Institutional assignment schedule with course subject, submission category, priority, and due dates.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={downloading === 'assignments_csv'}
                onClick={() => handleDownload('assignments', 'csv')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                disabled={downloading === 'assignments_xls'}
                onClick={() => handleDownload('assignments', 'xls')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handlePreview('assignments')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Preview on Screen
            </button>
          </div>
        </div>

        {/* Card 3: Submissions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Submission & Grade Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit log of completed student submissions, on-time vs late delivery verification, and awarded marks.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={downloading === 'submissions_csv'}
                onClick={() => handleDownload('submissions', 'csv')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                disabled={downloading === 'submissions_xls'}
                onClick={() => handleDownload('submissions', 'xls')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handlePreview('submissions')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Preview on Screen
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview Table */}
      {previewData && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                Report Preview: {previewType} ({previewData.length} records)
              </h2>
              <p className="text-xs text-slate-400">
                Generated at {new Date().toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              Close Preview
            </button>
          </div>

          {previewData.length === 0 ? (
            <p className="text-xs text-slate-400">No records available.</p>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                    {Object.keys(previewData[0]).map((header) => (
                      <th key={header} className="p-2.5 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      {Object.values(row).map((val, cellIdx) => (
                        <td key={cellIdx} className="p-2.5 whitespace-nowrap">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

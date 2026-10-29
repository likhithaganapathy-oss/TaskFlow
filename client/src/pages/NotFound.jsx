import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-center">
      <div className="max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404</h1>
        <p className="mt-2 text-base font-semibold text-slate-700">Page Not Found</p>
        <p className="mt-1 text-xs text-slate-500">
          The page or assignment you are looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;


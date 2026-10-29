import React from 'react';

const colorThemes = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    ring: 'focus:ring-blue-500',
    iconBg: 'bg-blue-600/10 text-blue-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    ring: 'focus:ring-amber-500',
    iconBg: 'bg-amber-600/10 text-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    ring: 'focus:ring-emerald-500',
    iconBg: 'bg-emerald-600/10 text-emerald-600',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-100',
    ring: 'focus:ring-rose-500',
    iconBg: 'bg-rose-600/10 text-rose-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    ring: 'focus:ring-indigo-500',
    iconBg: 'bg-indigo-600/10 text-indigo-600',
  },
  slate: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-100',
    ring: 'focus:ring-slate-500',
    iconBg: 'bg-slate-600/10 text-slate-600',
  },
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  onClick,
  active = false,
}) => {
  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <div
      onClick={onClick}
      className={`relative p-5 bg-white rounded-2xl border transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${
        active
          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
          : 'border-slate-200/80 shadow-sm shadow-slate-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 font-medium truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;


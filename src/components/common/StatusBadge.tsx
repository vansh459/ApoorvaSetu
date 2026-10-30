import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase().trim();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (normalized === 'in progress' || normalized === 'scrutiny' || normalized === 'evc scheduled') {
    colorClasses = 'bg-blue-100/90 text-blue-700 border-blue-200';
  } else if (normalized === 'pending' || normalized === 'pending review' || normalized === 'undertaking pending') {
    colorClasses = 'bg-amber-100/90 text-amber-700 border-amber-200';
  } else if (normalized === 'action required' || normalized === 'critical' || normalized === 'expired' || normalized === 'notice issued' || normalized === 'rejected') {
    colorClasses = 'bg-rose-100/90 text-rose-700 border-rose-200';
  } else if (normalized === 'approved' || normalized === 'scheduled' || normalized === 'completed' || normalized === 'verified') {
    colorClasses = 'bg-emerald-100/90 text-emerald-700 border-emerald-200';
  } else if (normalized === 'returned') {
    colorClasses = 'bg-purple-100/90 text-purple-700 border-purple-200';
  }

  const paddingClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${paddingClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {status}
    </span>
  );
};

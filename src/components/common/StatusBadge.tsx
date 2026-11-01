import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md'
}) => {
  const normalized = status.toLowerCase().trim();

  let colorClasses = 'bg-slate-100 text-slate-700';

  if (
    normalized === 'in progress' ||
    normalized === 'scrutiny' ||
    normalized === 'evc scheduled' ||
    normalized === 'submitted'
  ) {
    colorClasses = 'bg-[#e0edff] text-[#1d4ed8]';
  } else if (
    normalized === 'pending' ||
    normalized === 'pending review' ||
    normalized === 'undertaking pending' ||
    normalized === 'due today'
  ) {
    colorClasses = 'bg-[#fef3c7] text-[#b45309]';
  } else if (
    normalized === 'action required' ||
    normalized === 'critical' ||
    normalized === 'expired' ||
    normalized === 'notice issued' ||
    normalized === 'rejected' ||
    normalized === 'overdue' ||
    normalized === 'escalated'
  ) {
    colorClasses = 'bg-[#fee2e2] text-[#b91c1c]';
  } else if (
    normalized === 'approved' ||
    normalized === 'scheduled' ||
    normalized === 'completed' ||
    normalized === 'verified'
  ) {
    colorClasses = 'bg-[#dcfce7] text-[#15803d]';
  } else if (normalized === 'returned') {
    colorClasses = 'bg-[#f3e8ff] text-[#7e22ce]';
  }

  const paddingClasses =
    size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full transition-colors duration-200 ${paddingClasses} ${colorClasses}`}
    >
      {status}
    </span>
  );
};

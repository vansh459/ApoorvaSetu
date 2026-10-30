import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trendText?: string;
  trendColor?: 'green' | 'amber' | 'rose' | 'blue';
  subtext?: string;
  icon: LucideIcon;
  variant: 'blue' | 'amber' | 'green' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trendText,
  trendColor = 'green',
  subtext,
  icon: Icon,
  variant,
  onClick
}) => {
  // Pastel tinted styling matching the reference screenshot exactly
  const styles = {
    blue: {
      cardBg: 'bg-[#edf5ff] border-[#d8e8fc]',
      iconBg: 'bg-[#d8e8fc] text-[#2563eb]'
    },
    amber: {
      cardBg: 'bg-[#fff8ec] border-[#faebd4]',
      iconBg: 'bg-[#faebd4] text-[#d97706]'
    },
    green: {
      cardBg: 'bg-[#f0fbf4] border-[#d7f3e2]',
      iconBg: 'bg-[#d7f3e2] text-[#16a34a]'
    },
    rose: {
      cardBg: 'bg-[#fff1f2] border-[#fcdade]',
      iconBg: 'bg-[#fcdade] text-[#e11d48]'
    }
  }[variant];

  const trendColors = {
    green: 'text-[#16a34a]',
    amber: 'text-[#d97706]',
    rose: 'text-[#e11d48]',
    blue: 'text-[#2563eb]'
  }[trendColor];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border ${styles.cardBg} p-5 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-start space-x-3.5">
        {/* Rounded square icon container */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-600">
            {title}
          </div>
          <div className="text-2xl sm:text-[28px] font-bold text-slate-900 mt-0.5 tracking-tight leading-none">
            {value}
          </div>
        </div>
      </div>

      {/* Subtext and trend line */}
      <div className="mt-4 pt-1 flex items-center justify-between text-xs">
        {/* For card 1: trend then subtext. For cards 2-4: subtext on left, trend on right */}
        {variant === 'blue' ? (
          <div className="space-y-0.5">
            {trendText && (
              <span className={`font-semibold ${trendColors} mr-1.5`}>
                {trendText}
              </span>
            )}
            {subtext && <span className="text-slate-500">{subtext}</span>}
          </div>
        ) : (
          <>
            <span className="text-slate-500 font-normal">{subtext}</span>
            {trendText && (
              <span className={`font-semibold ${trendColors}`}>
                {trendText}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

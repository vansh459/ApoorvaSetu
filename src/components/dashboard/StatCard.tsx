import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trendText?: string;
  trendColor?: 'green' | 'amber' | 'rose' | 'blue';
  icon: LucideIcon;
  variant: 'blue' | 'amber' | 'green' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trendText,
  trendColor = 'green',
  icon: Icon,
  variant,
  onClick
}) => {
  // Soft pastel card styling matching the reference screenshot exactly
  const styles = {
    blue: {
      cardBg: 'bg-[#f4f8ff] border-[#e1edfc]',
      iconBg: 'bg-blue-100/70 text-blue-600',
      sparklineColor: '#3b82f6',
      sparklinePath: 'M 2 15 C 14 18, 22 10, 32 14 C 40 18, 48 8, 54 5'
    },
    amber: {
      cardBg: 'bg-[#fefaf3] border-[#faedd9]',
      iconBg: 'bg-amber-100/70 text-amber-600',
      sparklineColor: '#f59e0b',
      sparklinePath: 'M 2 14 C 14 8, 24 18, 34 16 C 42 14, 48 10, 54 6'
    },
    green: {
      cardBg: 'bg-[#f4fcf7] border-[#dcf5e7]',
      iconBg: 'bg-emerald-100/70 text-emerald-600',
      sparklineColor: '#10b981',
      sparklinePath: 'M 2 16 C 14 16, 24 8, 34 14 C 42 18, 48 8, 54 5'
    },
    rose: {
      cardBg: 'bg-[#fef6f7] border-[#fce2e5]',
      iconBg: 'bg-rose-100/70 text-rose-600',
      sparklineColor: '#f43f5e',
      sparklinePath: 'M 2 15 C 14 10, 24 16, 34 8 C 42 6, 48 14, 54 8'
    }
  }[variant];

  const trendColors = {
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    blue: 'text-blue-600'
  }[trendColor];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border ${styles.cardBg} p-4 sm:p-5 shadow-2xs transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}
        >
          <Icon className="w-4.5 h-4.5 stroke-[2]" />
        </div>

        {/* Center: Title & Large Value */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-600 truncate">
            {title}
          </div>
          <div className="text-2xl sm:text-[26px] font-bold text-slate-900 mt-0.5 tracking-tight leading-tight">
            {value}
          </div>
        </div>

        {/* Right: Perfectly contained sparkline wave */}
        <div className="shrink-0 pt-2.5">
          <svg
            viewBox="0 0 56 20"
            fill="none"
            className="w-12 sm:w-14 h-5 overflow-hidden"
          >
            <path
              d={styles.sparklinePath}
              stroke={styles.sparklineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Bottom: Trend Text */}
      <div className="mt-3 pt-0.5 flex items-center text-xs">
        {trendText && (
          <span className={`font-semibold ${trendColors}`}>
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
};

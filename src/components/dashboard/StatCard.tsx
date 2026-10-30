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
  const styles = {
    blue: {
      cardBg: 'bg-[#f8faff] border-slate-200/70 hover:border-blue-300',
      iconBg: 'bg-blue-100/70 text-blue-600',
      sparklineColor: '#2563eb',
      sparklinePath: 'M 2 15 C 14 18, 22 10, 32 14 C 40 18, 48 8, 54 5'
    },
    amber: {
      cardBg: 'bg-[#fffbf5] border-slate-200/70 hover:border-amber-300',
      iconBg: 'bg-amber-100/70 text-amber-600',
      sparklineColor: '#f59e0b',
      sparklinePath: 'M 2 14 C 14 8, 24 18, 34 16 C 42 14, 48 10, 54 6'
    },
    green: {
      cardBg: 'bg-[#f7fdf9] border-slate-200/70 hover:border-emerald-300',
      iconBg: 'bg-emerald-100/70 text-emerald-600',
      sparklineColor: '#10b981',
      sparklinePath: 'M 2 16 C 14 16, 24 8, 34 14 C 42 18, 48 8, 54 5'
    },
    rose: {
      cardBg: 'bg-[#fef8f8] border-slate-200/70 hover:border-rose-300',
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
      className={`rounded-xl border ${styles.cardBg} p-4 sm:p-4.5 shadow-2xs transition-all duration-200 ease-out group flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]' : ''
      }`}
    >
      {/* Top Row: Full Title + Compact Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-600 transition-colors duration-150 group-hover:text-slate-900 leading-tight line-clamp-1">
          {title}
        </span>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${styles.iconBg}`}
        >
          <Icon className="w-4 h-4 stroke-[2]" />
        </div>
      </div>

      {/* Middle: Prominent Value */}
      <div className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight leading-none mb-3">
        {value}
      </div>

      {/* Bottom: Trend Indicator & Sparkline */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px]">
        {trendText ? (
          <span className={`font-semibold ${trendColors}`}>
            {trendText}
          </span>
        ) : (
          <span className="text-slate-400">Current cycle</span>
        )}

        <svg
          viewBox="0 0 56 20"
          fill="none"
          className="w-11 h-4 overflow-hidden opacity-75 group-hover:opacity-100 transition-opacity"
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
  );
};

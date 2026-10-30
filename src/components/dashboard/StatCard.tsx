import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trendText?: string;
  trendDirection?: 'up' | 'down';
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
  // Color configuration to precisely match screenshot cards
  const styles = {
    blue: {
      cardBg: 'bg-[#eff6ff]/70 border-[#dbeafe]',
      iconBg: 'bg-[#dbeafe] text-[#2563eb]',
      hoverBorder: 'hover:border-blue-300'
    },
    amber: {
      cardBg: 'bg-[#fffbeb]/70 border-[#fef3c7]',
      iconBg: 'bg-[#fef3c7] text-[#d97706]',
      hoverBorder: 'hover:border-amber-300'
    },
    green: {
      cardBg: 'bg-[#f0fdf4]/70 border-[#dcfce7]',
      iconBg: 'bg-[#dcfce7] text-[#16a34a]',
      hoverBorder: 'hover:border-green-300'
    },
    rose: {
      cardBg: 'bg-[#fff1f2]/70 border-[#ffe4e6]',
      iconBg: 'bg-[#ffe4e6] text-[#e11d48]',
      hoverBorder: 'hover:border-rose-300'
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
      className={`relative p-5 rounded-2xl border ${styles.cardBg} ${styles.hoverBorder} transition-all duration-200 shadow-2xs ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start space-x-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-600 tracking-tight">
            {title}
          </div>
          <div className="text-2xl sm:text-[28px] font-bold text-slate-900 mt-0.5 tracking-tight">
            {value}
          </div>
        </div>
      </div>

      {/* Trend / Subtext row */}
      <div className="mt-3 pt-2 flex items-center justify-between text-xs border-t border-black/5">
        <div className="flex items-center space-x-1 text-slate-500 font-medium">
          {subtext && <span>{subtext}</span>}
          {trendText && (
            <span className={`font-semibold ${trendColors}`}>
              {trendText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

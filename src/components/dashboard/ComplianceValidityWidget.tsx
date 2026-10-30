import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  FileClock,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const ComplianceValidityWidget: React.FC = () => {
  const navigate = useNavigate();

  // Concise compliance items with guaranteed zero overflow
  const complianceItems = [
    {
      label: 'Land / Infra Expiring',
      count: '12',
      icon: AlertCircle,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600'
    },
    {
      label: 'Undertakings Pending',
      count: '28',
      icon: FileClock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
    {
      label: 'Submissions Pending',
      count: '16',
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Completed Submissions',
      count: '142',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      label: 'Expiring Soon',
      count: '09',
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
            Compliance Validity
          </h2>
        </div>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap shrink-0 ml-2 active:scale-95 transition-transform duration-100"
        >
          View All
        </button>
      </div>

      {/* Items List - Strictly contained with zero overflow */}
      <div className="space-y-1.5 my-auto min-w-0">
        {complianceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              onClick={() => navigate('/compliance')}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all duration-150 active:scale-[0.99] group min-w-0 gap-2"
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate min-w-0"
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>

              <span className="text-xs font-bold text-slate-900 shrink-0 tabular-nums">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

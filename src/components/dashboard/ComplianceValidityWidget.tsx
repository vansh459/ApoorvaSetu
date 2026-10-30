import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  FileClock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const ComplianceValidityWidget: React.FC = () => {
  const navigate = useNavigate();

  const complianceItems = [
    {
      label: 'Lease Documents (expiring < 3 months)',
      count: '126',
      icon: FileText,
      iconBg: 'bg-[#fee2e2]',
      iconColor: 'text-[#ef4444]'
    },
    {
      label: 'Other Institutional Undertakings',
      count: '243',
      icon: FileClock,
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#f59e0b]'
    },
    {
      label: 'Compliance Submissions (pending)',
      count: '389',
      icon: FileText,
      iconBg: 'bg-[#e0edff]',
      iconColor: 'text-[#3b82f6]'
    },
    {
      label: 'Documents Expired',
      count: '67',
      icon: AlertCircle,
      iconBg: 'bg-[#fee2e2]',
      iconColor: 'text-[#ef4444]'
    },
    {
      label: 'Documents Valid',
      count: '4,957',
      icon: CheckCircle2,
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#10b981]'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
            Compliance & Document Validity
          </h2>
        </div>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap shrink-0 ml-2"
        >
          View All
        </button>
      </div>

      {/* Items List - complete full readable text */}
      <div className="space-y-2.5 my-auto min-w-0">
        {complianceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              onClick={() => navigate('/compliance')}
              className="flex items-center justify-between p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group min-w-0"
            >
              <div className="flex items-center space-x-2.5 min-w-0 mr-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors leading-tight">
                  {item.label}
                </span>
              </div>

              <span className="text-xs sm:text-sm font-bold text-slate-900 shrink-0 whitespace-nowrap">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Calendar,
  Search,
  UploadCloud,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuickActionsPanel: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveModal } = useApp();

  const actions = [
    {
      label: 'Schedule EVC Visit',
      icon: Calendar,
      action: () => setActiveModal('schedule-evc')
    },
    {
      label: 'Track Application',
      icon: Search,
      action: () => setActiveModal('track-app')
    },
    {
      label: 'Upload Compliance',
      icon: UploadCloud,
      action: () => setActiveModal('upload-compliance')
    },
    {
      label: 'Pending Undertakings',
      icon: FileText,
      action: () => navigate('/compliance')
    },
    {
      label: 'Generate Report',
      icon: FileSpreadsheet,
      action: () => setActiveModal('generate-report')
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Quick Actions
        </h2>
      </div>

      {/* Buttons List */}
      <div className="space-y-1.5 my-auto min-w-0">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg border border-slate-200/60 hover:border-blue-400 hover:bg-blue-50/40 text-slate-700 hover:text-blue-700 active:scale-[0.99] transition-all duration-150 text-xs font-semibold group cursor-pointer text-left bg-white min-w-0"
            >
              <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0 transition-transform duration-150 group-hover:scale-105" />
              <span className="truncate min-w-0">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

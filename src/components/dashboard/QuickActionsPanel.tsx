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
      label: 'View Pending Undertakings',
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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center space-x-2.5 mb-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Quick Actions
        </h2>
      </div>

      {/* Buttons List with full readable text */}
      <div className="space-y-2.5 my-auto min-w-0">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 text-slate-700 hover:text-blue-700 transition-colors text-xs font-semibold group cursor-pointer text-left bg-white min-w-0"
            >
              <Icon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

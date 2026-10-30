import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, Search, Upload, FileText, Download } from 'lucide-react';
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
      icon: Upload,
      action: () => setActiveModal('upload-compliance')
    },
    {
      label: 'View Pending Undertakings',
      icon: FileText,
      action: () => navigate('/compliance')
    },
    {
      label: 'Generate Report',
      icon: Download,
      action: () => setActiveModal('generate-report')
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">Quick Actions</h2>
      </div>

      {/* Action Buttons List */}
      <div className="space-y-2.5 my-auto">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 transition-all text-xs font-semibold group cursor-pointer text-left shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-blue-100/70 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

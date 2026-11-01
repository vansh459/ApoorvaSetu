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
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  filterDocumentsForUser,
  filterUndertakingsForUser
} from '../../services/rbacService';
import { authService } from '../../services/authService';
import { resolveWorkflowConfig } from '../../workflow/config';
import { complianceSnapshot } from '../../workflow/selectors';
import { getNow } from '../../utils/dates';

export const ComplianceValidityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { undertakings, documents } = useApp();
  const { user } = useAuth();

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const snapshot = complianceSnapshot(
    filterUndertakingsForUser(undertakings, user),
    filterDocumentsForUser(documents, user),
    config,
    getNow()
  );

  const complianceItems = [
    {
      label: 'Undertakings overdue',
      count: snapshot.undertakings.overdue,
      icon: AlertCircle,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      path: '/compliance'
    },
    {
      label: 'Evidence to verify',
      count: snapshot.undertakings.submitted,
      icon: FileClock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      path: '/compliance'
    },
    {
      label: 'Documents expiring',
      count: snapshot.documents.expiringSoon,
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      path: '/documents'
    },
    {
      label: 'Documents expired',
      count: snapshot.documents.expired,
      icon: Clock,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      path: '/documents'
    },
    {
      label: 'Documents in force',
      count: snapshot.documents.valid,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      path: '/documents'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
            Compliance validity
          </h2>
        </div>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap shrink-0 ml-2 active:scale-95 transition-transform duration-100"
        >
          View all
        </button>
      </div>

      <div className="space-y-1.5 my-auto min-w-0">
        {complianceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              role="button"
              tabIndex={0}
              onClick={() => navigate(item.path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(item.path);
                }
              }}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer active:scale-[0.99] group min-w-0 gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 group-hover:scale-105 ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 whitespace-nowrap">
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

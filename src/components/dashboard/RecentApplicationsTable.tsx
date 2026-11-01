import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFilter } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { STAGE_META, canonicalStage } from '../../workflow/stages';
import { parseDate } from '../../utils/dates';

export const RecentApplicationsTable: React.FC = () => {
  const navigate = useNavigate();
  const { applications, setSelectedApplication, setActiveModal } = useApp();
  const { user } = useAuth();

  const recent = [...filterApplicationsForUser(applications, user)]
    .sort((a, b) => (parseDate(b.lastUpdated)?.getTime() ?? 0) - (parseDate(a.lastUpdated)?.getTime() ?? 0))
    .slice(0, 5);

  const openCase = (appId: string) => {
    const app = applications.find((item) => item.id === appId);
    if (!app) return;
    setSelectedApplication(app);
    setActiveModal('app-detail');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ListFilter className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
            Recent applications
          </h2>
        </div>
        <button
          onClick={() => navigate('/applications')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap active:scale-95 transition-transform duration-100"
        >
          View all
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-slate-500 my-auto py-6 text-center">
          No applications in scope yet.
        </p>
      ) : (
        <div className="overflow-x-auto scrollbar-none flex-1 min-w-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                <th className="pb-2.5 pr-2.5 font-semibold">Application</th>
                <th className="pb-2.5 pr-2.5 font-semibold">Institution</th>
                <th className="pb-2.5 pr-2.5 font-semibold hidden xl:table-cell">Region</th>
                <th className="pb-2.5 pr-2.5 font-semibold">Stage</th>
                <th className="pb-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-xs">
              {recent.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => openCase(app.id)}
                  className="hover:bg-slate-50/70 cursor-pointer group whitespace-nowrap"
                >
                  <td className="py-2.5 pr-2.5 text-blue-600 font-semibold group-hover:underline">
                    {app.id}
                  </td>
                  <td className="py-2.5 pr-2.5 text-slate-900 font-medium max-w-[140px] sm:max-w-[170px] truncate">
                    {app.instituteName}
                  </td>
                  <td className="py-2.5 pr-2.5 text-slate-600 font-medium hidden xl:table-cell">
                    {app.region}
                  </td>
                  <td className="py-2.5 pr-2.5 text-slate-600 font-medium">
                    {STAGE_META[canonicalStage(app.stage)].shortLabel}
                  </td>
                  <td className="py-2.5 text-right">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

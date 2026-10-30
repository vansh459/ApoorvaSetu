import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFilter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';

export const RecentApplicationsTable: React.FC = () => {
  const navigate = useNavigate();
  const { applications, setSelectedApplication, setActiveModal } = useApp();

  const recentApps = applications.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center space-x-2.5 mb-4 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ListFilter className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Recent Applications
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 min-w-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-medium text-slate-500 whitespace-nowrap">
              <th className="pb-3 pr-3 font-medium">Application ID</th>
              <th className="pb-3 pr-3 font-medium">Institute Name</th>
              <th className="pb-3 pr-3 font-medium">Stage</th>
              <th className="pb-3 pr-3 font-medium">Region</th>
              <th className="pb-3 pr-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {recentApps.map((app) => (
              <tr
                key={app.id}
                onClick={() => {
                  setSelectedApplication(app);
                  setActiveModal('app-detail');
                }}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors group whitespace-nowrap"
              >
                <td className="py-3 pr-3 text-slate-700 font-medium">
                  {app.id}
                </td>
                <td className="py-3 pr-3 text-slate-900 font-semibold">
                  {app.instituteName}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {app.stage === 'Expert Visit Committee (EVC)'
                    ? 'EVC Scheduled'
                    : app.stage === 'Scrutiny / Re-scrutiny'
                    ? 'Scrutiny'
                    : app.stage === 'Approval (Subject to Undertaking)'
                    ? 'Undertaking Pending'
                    : app.stage}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {app.region}
                </td>
                <td className="py-3 pr-3">
                  <StatusBadge status={app.status} size="sm" />
                </td>
                <td className="py-3 text-right text-slate-500 font-normal">
                  {app.lastUpdated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom link matching reference */}
      <div className="pt-3 border-t border-slate-100 mt-2 shrink-0">
        <button
          onClick={() => navigate('/applications')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1 cursor-pointer"
        >
          <span>View All Applications</span>
          <span className="text-sm">→</span>
        </button>
      </div>
    </div>
  );
};

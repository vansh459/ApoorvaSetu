import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFilter, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';

export const RecentApplicationsTable: React.FC = () => {
  const navigate = useNavigate();
  const { applications, setSelectedApplication, setActiveModal } = useApp();

  const recentApps = applications.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ListFilter className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">
            Recent Applications
          </h2>
        </div>
        <button
          onClick={() => navigate('/applications')}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center space-x-1"
        >
          <span>All ({applications.length})</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-2.5 font-bold">Application ID</th>
              <th className="pb-2.5 font-bold">Institute Name</th>
              <th className="pb-2.5 font-bold">Stage</th>
              <th className="pb-2.5 font-bold">Region</th>
              <th className="pb-2.5 font-bold">Status</th>
              <th className="pb-2.5 font-bold text-right">Last Updated</th>
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
                className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
              >
                <td className="py-3 font-semibold text-blue-600 group-hover:text-blue-700">
                  {app.id}
                </td>
                <td className="py-3 font-medium text-slate-800 truncate max-w-[150px]">
                  {app.instituteName}
                </td>
                <td className="py-3 text-slate-600 truncate max-w-[140px]">
                  {app.stage === 'Expert Visit Committee (EVC)'
                    ? 'EVC Scheduled'
                    : app.stage === 'Scrutiny / Re-scrutiny'
                    ? 'Scrutiny'
                    : app.stage === 'Approval (Subject to Undertaking)'
                    ? 'Undertaking Pending'
                    : app.stage}
                </td>
                <td className="py-3 text-slate-600">
                  {app.region}
                </td>
                <td className="py-3">
                  <StatusBadge status={app.status} size="sm" />
                </td>
                <td className="py-3 text-right text-slate-500 font-medium">
                  {app.lastUpdated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom link matching screenshot */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={() => navigate('/applications')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition-colors"
        >
          <span>View All Applications</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>
    </div>
  );
};

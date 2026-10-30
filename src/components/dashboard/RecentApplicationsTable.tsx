import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFilter } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const RecentApplicationsTable: React.FC = () => {
  const navigate = useNavigate();

  // Application rows matching the new reference design
  const applications = [
    {
      id: 'APP2026-0012',
      instituteName: 'ABC Institute of Tech...',
      type: 'New',
      region: 'Northern',
      stage: 'EVC',
      status: 'In Progress',
      lastUpdated: '30 Oct 2026'
    },
    {
      id: 'APP2026-0011',
      instituteName: 'XYZ Engineering College',
      type: 'Extension',
      region: 'Western',
      stage: 'Scrutiny',
      status: 'Pending',
      lastUpdated: '29 Oct 2026'
    },
    {
      id: 'APP2026-0010',
      instituteName: 'LMN University',
      type: 'New',
      region: 'Southern',
      stage: 'Undertaking',
      status: 'Approved',
      lastUpdated: '28 Oct 2026'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon & View All link matching reference */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ListFilter className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
            Recent Applications
          </h2>
        </div>
        <button
          onClick={() => navigate('/applications')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap active:scale-95 transition-transform duration-100"
        >
          View All
        </button>
      </div>

      {/* Table matching reference */}
      <div className="overflow-x-auto flex-1 min-w-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-medium text-slate-500 whitespace-nowrap">
              <th className="pb-3 pr-3 font-medium">Application ID</th>
              <th className="pb-3 pr-3 font-medium">Institution Name</th>
              <th className="pb-3 pr-3 font-medium">Type</th>
              <th className="pb-3 pr-3 font-medium">Region</th>
              <th className="pb-3 pr-3 font-medium">Current Stage</th>
              <th className="pb-3 pr-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {applications.map((app) => (
              <tr
                key={app.id}
                onClick={() => navigate('/applications')}
                className="hover:bg-blue-50/40 cursor-pointer transition-colors duration-150 group whitespace-nowrap"
              >
                <td className="py-3 pr-3 text-slate-700 font-medium group-hover:text-blue-600 transition-colors duration-150">
                  {app.id}
                </td>
                <td className="py-3 pr-3 text-slate-900 font-semibold">
                  {app.instituteName}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {app.type}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {app.region}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {app.stage}
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
    </div>
  );
};

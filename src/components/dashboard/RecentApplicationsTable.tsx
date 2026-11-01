import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFilter } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { STAGE_META, canonicalStage } from '../../workflow/stages';
import { parseDate } from '../../utils/dates';
import { Card } from '../ui';

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
    <Card padded="none" className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <ListFilter className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="text-sm font-semibold leading-snug text-ink">Recent applications</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/applications')}
          className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
        >
          View all
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="my-auto px-5 py-10 text-center text-sm text-ink-2">
          No applications in scope yet.
        </p>
      ) : (
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Five most recently updated applications</caption>
            <thead>
              <tr className="border-b border-line text-xs text-ink-2">
                <th scope="col" className="px-5 py-2.5 font-medium">Application</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Institution</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium 2xl:table-cell">Region</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium 2xl:table-cell">Stage</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70 text-sm">
              {recent.map((app) => (
                <tr
                  key={app.id}
                  tabIndex={0}
                  onClick={() => openCase(app.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openCase(app.id);
                    }
                  }}
                  className="cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-surface-2"
                >
                  <td className="px-5 py-3 font-medium text-accent">{app.id}</td>
                  <td className="max-w-[170px] truncate px-3 py-3 font-medium text-ink">
                    {app.instituteName}
                  </td>
                  <td className="hidden px-3 py-3 text-ink-2 2xl:table-cell">{app.region}</td>
                  <td className="hidden px-3 py-3 text-ink-2 2xl:table-cell">
                    {STAGE_META[canonicalStage(app.stage)].shortLabel}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

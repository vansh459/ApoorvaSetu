import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { authService } from '../../services/authService';
import { resolveWorkflowConfig } from '../../workflow/config';
import { evcQueueSummary, isReportOverdue } from '../../workflow/selectors';
import { getNow, parseDate } from '../../utils/dates';
import { Badge, Card } from '../ui';

export const UpcomingEVCList: React.FC = () => {
  const navigate = useNavigate();
  const { evcVisits } = useApp();
  const { user } = useAuth();

  const visits = filterEVCVisitsForUser(evcVisits, user);
  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = getNow();
  const summary = evcQueueSummary(visits, config, now);

  const scheduled = visits
    .filter((visit) => visit.status === 'Scheduled' || visit.status === 'Pending')
    .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));

  const visible = (summary.upcoming.length ? summary.upcoming : scheduled).slice(0, 4);

  return (
    <Card padded="none" className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Calendar className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="text-sm font-semibold leading-snug text-ink">EVC visit schedule</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/evc-scheduling')}
          className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
        >
          View all
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="my-auto px-5 py-10 text-center text-sm text-ink-2">
          No inspections are scheduled.
        </p>
      ) : (
        <div className="my-auto min-w-0 space-y-1 px-3 py-3">
          {visible.map((visit) => {
            const date = parseDate(visit.date);
            const day = date ? String(date.getDate()).padStart(2, '0') : visit.displayDate.day;
            const month = date
              ? date.toLocaleString('en-US', { month: 'short' })
              : visit.displayDate.month;
            const overdue = isReportOverdue(visit, config, now);
            const label = overdue
              ? 'Report overdue'
              : visit.status === 'Pending'
                ? 'Panel pending'
                : 'Scheduled';
            const tone = overdue ? 'danger' : visit.status === 'Pending' ? 'warning' : 'success';

            return (
              <button
                key={visit.id}
                type="button"
                onClick={() => navigate('/evc-scheduling')}
                className="group flex w-full min-w-0 items-center justify-between gap-3 rounded-control p-2 text-left transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-control bg-surface-2 text-center">
                    <span className="text-sm font-semibold leading-none text-ink">{day}</span>
                    <span className="mt-1 text-xs leading-none text-ink-2">{month}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium leading-tight text-ink">
                      {visit.instituteName}
                    </h4>
                    <p className="mt-0.5 truncate text-xs leading-tight text-ink-2">
                      {visit.region} region
                    </p>
                  </div>
                </div>

                <Badge tone={tone} size="sm">
                  {label}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

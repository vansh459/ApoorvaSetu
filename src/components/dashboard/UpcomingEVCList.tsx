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
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
            EVC visit schedule
          </h2>
        </div>
        <button
          onClick={() => navigate('/evc-scheduling')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap shrink-0 ml-2 active:scale-95 transition-transform duration-100"
        >
          View all
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-slate-500 my-auto py-6 text-center">
          No inspections are scheduled.
        </p>
      ) : (
        <div className="space-y-2.5 sm:space-y-3 my-auto min-w-0">
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
            const tone = overdue
              ? 'bg-rose-50 text-rose-700'
              : visit.status === 'Pending'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700';

            return (
              <div
                key={visit.id}
                onClick={() => navigate('/evc-scheduling')}
                className="flex items-center justify-between cursor-pointer hover:bg-slate-50/80 p-1.5 rounded-xl active:scale-[0.99] group min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
                  <div className="flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-50 border border-slate-200/80 group-hover:border-blue-300 group-hover:bg-blue-50/50 text-center shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 leading-none">
                      {day}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 mt-0.5 leading-none">
                      {month}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                      {visit.instituteName}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                      {visit.region} region
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  <span
                    className={`inline-block text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap ${tone}`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

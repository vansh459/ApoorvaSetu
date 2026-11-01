import React, { useMemo, useState } from 'react';
import { ClipboardList, Search, CalendarPlus, ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { buildEVCQueue } from '../../workflow/evc';
import type { EVCQueueState } from '../../workflow/evc';
import { getStageMeta } from '../../workflow/stages';
import { routeForApplication } from '../../workflow/routes';
import { formatDisplayDate } from '../../utils/dates';

const STATE_STYLES: Record<EVCQueueState, string> = {
  'Report overdue': 'bg-rose-50 text-rose-700 border-rose-200',
  'Awaiting scheduling': 'bg-amber-50 text-amber-700 border-amber-200',
  Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

export const EVCQueue: React.FC = () => {
  const { user } = useAuth();
  const { applications, evcVisits, setSelectedApplication, setActiveModal } = useApp();

  const [stateFilter, setStateFilter] = useState<'All' | EVCQueueState>('All');
  const [search, setSearch] = useState('');

  const scopedApplications = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );

  const rows = useMemo(
    () => buildEVCQueue(scopedApplications, evcVisits),
    [scopedApplications, evcVisits]
  );

  const filtered = rows.filter((row) => {
    const matchesState = stateFilter === 'All' || row.state === stateFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      row.application.id.toLowerCase().includes(term) ||
      row.application.instituteName.toLowerCase().includes(term) ||
      (row.visit?.assignedCommittee ?? '').toLowerCase().includes(term);
    return matchesState && matchesSearch;
  });

  const counts = {
    awaiting: rows.filter((row) => row.state === 'Awaiting scheduling').length,
    scheduled: rows.filter((row) => row.state === 'Scheduled').length,
    overdue: rows.filter((row) => row.state === 'Report overdue').length,
    completed: rows.filter((row) => row.state === 'Completed').length
  };

  const openCase = (applicationId: string) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) return;
    setSelectedApplication(application);
    setActiveModal('app-detail');
  };

  const scheduleVisit = (applicationId: string) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) return;
    setSelectedApplication(application);
    setActiveModal('schedule-evc');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Inspection Operations
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Route-derived work queue</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">EVC Work Queue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Every case that has reached the Expert Visit Committee stage, with its inspection and report deadline.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('schedule-evc')}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Schedule EVC Visit</span>
        </button>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800">Awaiting scheduling</div>
          <div className="text-2xl font-bold text-amber-950 mt-0.5">{counts.awaiting}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">No active visit linked</div>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-2xs">
          <div className="text-xs font-semibold text-blue-800">Scheduled</div>
          <div className="text-2xl font-bold text-blue-950 mt-0.5">{counts.scheduled}</div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">Committee constituted</div>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="text-xs font-semibold text-rose-800">Report overdue</div>
          <div className="text-2xl font-bold text-rose-950 mt-0.5">{counts.overdue}</div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">Past the report SLA</div>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800">Completed</div>
          <div className="text-2xl font-bold text-emerald-950 mt-0.5">{counts.completed}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Report on record</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case, institute or committee..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(['All', 'Awaiting scheduling', 'Scheduled', 'Report overdue', 'Completed'] as const).map((state) => (
            <button
              key={state}
              onClick={() => setStateFilter(state)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                stateFilter === state ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Queue rows */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Nothing in this queue</div>
          <p className="text-xs text-slate-500 mt-1">
            Forward a case to the Expert Visit Committee stage and it will appear here for scheduling.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ application, visit, state, daysOverdue }) => (
            <div
              key={application.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{application.instituteName}</span>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {application.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATE_STYLES[state]}`}>
                    {state}
                  </span>
                  {daysOverdue > 0 && (
                    <span className="text-[10px] font-semibold text-rose-700 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{daysOverdue} day(s) overdue</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center space-x-3 flex-wrap gap-y-1">
                  <span>{routeForApplication(application).label}</span>
                  <span>Stage: {getStageMeta(application.stage).label}</span>
                  <span>{application.region} Region</span>
                  {visit ? (
                    <span>Visit {formatDisplayDate(visit.date)} · {visit.assignedCommittee}</span>
                  ) : (
                    <span className="text-amber-700 font-medium">No visit scheduled</span>
                  )}
                </div>

                {visit?.reportSubmitted ? (
                  <div className="text-[11px] text-emerald-700 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Report {visit.report?.id} submitted — {visit.report?.recommendations ?? 'on record'}
                    </span>
                  </div>
                ) : visit?.reportDueAt ? (
                  <div className="text-[11px] text-slate-500">
                    Report due {formatDisplayDate(visit.reportDueAt)}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
                {state === 'Awaiting scheduling' && (
                  <button
                    onClick={() => scheduleVisit(application.id)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Schedule visit</span>
                  </button>
                )}
                <button
                  onClick={() => openCase(application.id)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Open case</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

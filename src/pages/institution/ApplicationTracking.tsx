import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  CalendarClock,
  FileSearch
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { getApplicationStagePath } from '../../workflow/routes';
import { canonicalStage, getStageMeta } from '../../workflow/stages';
import { formatDisplayDate } from '../../utils/dates';
import type { ApplicationStage } from '../../types';

export const ApplicationTracking: React.FC = () => {
  const { user } = useAuth();
  const { applications, showToast } = useApp();

  const myApps = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeApp = myApps.find((app) => app.id === selectedId) ?? myApps[0];

  const steps = useMemo(() => {
    if (!activeApp) return [];
    const path = getApplicationStagePath(activeApp);
    const byStage = new Map(activeApp.timeline.map((event) => [canonicalStage(event.stage as ApplicationStage), event]));
    return path.map((stage, index) => {
      const meta = getStageMeta(stage);
      const event = byStage.get(stage);
      return {
        key: `${stage}-${index}`,
        label: meta.label,
        officer: meta.responsible,
        date: event?.date ?? 'Pending',
        status: event?.status ?? 'pending',
        note: event?.notes,
        dueAt: event?.dueAt
      };
    });
  }, [activeApp]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Real-Time Tracking
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">{user?.instituteName || 'Institution'}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Application Progress & Regulatory Audit
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Live milestone timeline, regulatory officer communications, and action advisories.
        </p>
      </div>

      {!activeApp ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs">
          <FileSearch className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">No applications filed yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Submit an application to start tracking its routing, deadlines and officer actions.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold text-blue-700 font-mono">
                  {activeApp.id}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-slate-900">{activeApp.type}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                <span>Submitted: {activeApp.appliedDate}</span>
                <span>•</span>
                <span>
                  Intake Proposed:{' '}
                  <strong className="text-slate-800">{activeApp.intakeProposed} Seats</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 shrink-0">
              {myApps.length > 1 && (
                <select
                  value={activeApp.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                  aria-label="Select application"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {myApps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.id} — {app.type}
                    </option>
                  ))}
                </select>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                Current Stage: {getStageMeta(activeApp.stage).shortLabel}
              </span>
              <button
                onClick={() => showToast('Application summary downloaded as PDF', 'success')}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Download Application Summary"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Approval Milestones & Officer Log
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {steps.map((step, index) => {
                const isDone = step.status === 'completed';
                const isCurrent = step.status === 'current';

                return (
                  <div key={step.key} className="relative flex items-start space-x-4 text-xs">
                    <div
                      className={`absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                            : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span
                          className={`text-sm font-bold ${
                            isDone
                              ? 'text-slate-900'
                              : isCurrent
                                ? 'text-blue-700 font-extrabold'
                                : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 font-mono">
                          {step.date}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600">
                        Responsible Authority: <strong className="text-slate-800">{step.officer}</strong>
                      </div>

                      {step.dueAt && isCurrent && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                          Statutory deadline:{' '}
                          <strong className="text-slate-800">{formatDisplayDate(step.dueAt)}</strong>
                        </div>
                      )}

                      {step.note && (
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed mt-2">
                          {step.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

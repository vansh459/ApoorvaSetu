import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  ChevronRight,
  ShieldAlert,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { filterEVCVisitsForUser } from '../../../services/rbacService';
import { authService } from '../../../services/authService';
import { resolveWorkflowConfig } from '../../../workflow/config';
import {
  evcQueueSummary,
  isReportOverdue,
  pendingReports
} from '../../../workflow/selectors';
import { formatDisplayDate, getNow, parseDate } from '../../../utils/dates';

export const EVCMemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { evcVisits } = useApp();

  const systemConfig = authService.getSystemConfig();
  const config = resolveWorkflowConfig(systemConfig);
  const now = getNow();

  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);
  const summary = evcQueueSummary(assignedVisits, config, now);

  const reportQueue = assignedVisits
    .filter((visit) => visit.status !== 'Cancelled' && !visit.reportSubmitted)
    .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));

  const schedule = [...assignedVisits]
    .sort((a, b) => {
      const aActive = a.status === 'Scheduled' || a.status === 'Pending' ? 0 : 1;
      const bActive = b.status === 'Scheduled' || b.status === 'Pending' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const left = parseDate(a.date)?.getTime() ?? 0;
      const right = parseDate(b.date)?.getTime() ?? 0;
      return aActive === 0 ? left - right : right - left;
    })
    .slice(0, 4);

  const reportDue = reportQueue[0];
  const overdueCount = pendingReports(assignedVisits, now).length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 border border-amber-800/50 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
              <ClipboardCheck className="w-3 h-3" />
              <span>{user?.committeeName || 'Expert Visit Committee'}</span>
            </span>
            <span className="text-xs text-amber-200">Assigned inspector: {user?.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Inspection workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Conduct facility audits, record checklist findings, attach evidence, and submit the inspection report.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('/evc/checklist')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Inspection checklist</span>
          </button>
          <button
            onClick={() => navigate('/evc/my-visits')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Submit report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Assigned
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{assignedVisits.length}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Assigned visits</div>
        </div>

        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{summary.scheduled}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Upcoming inspections</div>
        </div>

        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              {overdueCount} overdue
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{reportQueue.length}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Reports outstanding</div>
        </div>

        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              On record
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{summary.completed}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Completed inspections</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Assigned inspection visits</h2>
            </div>
            <button
              onClick={() => navigate('/evc/my-visits')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
            >
              All my visits
            </button>
          </div>

          {schedule.length === 0 ? (
            <p className="text-xs text-slate-500 my-auto py-6 text-center">
              No inspection visits are assigned to this committee.
            </p>
          ) : (
            <div className="space-y-3 my-auto">
              {schedule.map((visit) => {
                const overdue = isReportOverdue(visit, config, now);
                const active = visit.status === 'Scheduled' || visit.status === 'Pending';
                return (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {visit.instituteName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            overdue
                              ? 'bg-rose-100 text-rose-800'
                              : visit.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : visit.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {overdue ? 'Report overdue' : visit.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDisplayDate(visit.date)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{visit.stateRegion}</span>
                        </span>
                        <span>{visit.mode} inspection</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      {active ? (
                        <>
                          <button
                            onClick={() => navigate('/evc/checklist')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Checklist
                          </button>
                          <button
                            onClick={() => navigate('/evc/my-visits')}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            Submit report
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => navigate('/evc/my-visits')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                        >
                          <span>View record</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Next report due</h2>
            </div>
            {reportDue && isReportOverdue(reportDue, config, now) && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                Overdue
              </span>
            )}
          </div>

          {reportDue ? (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-900 my-auto">
              <div className="font-bold">
                {reportDue.instituteName} ({reportDue.applicationId})
              </div>
              <div className="text-[11px] text-amber-800 space-y-0.5">
                <div>Inspection date: {formatDisplayDate(reportDue.date)}</div>
                {reportDue.reportDueAt && (
                  <div>Report due: {formatDisplayDate(reportDue.reportDueAt)}</div>
                )}
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Submit the completed checklist, evidence, and signed recommendation to clear this case.
              </p>
              <div className="pt-2 flex items-center space-x-2">
                <button
                  onClick={() => navigate('/evc/my-visits')}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Submit report
                </button>
                <button
                  onClick={() => navigate('/evc/evidence')}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-50 cursor-pointer"
                >
                  Upload evidence
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 my-auto">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>No inspection reports are outstanding.</span>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1 text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Scoped to assigned committee</span>
            </span>
            <span className="font-semibold text-slate-700">AICTE handbook AY {systemConfig.academicYear}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

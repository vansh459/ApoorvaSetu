import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  Building2,
  ArrowRight,
  ShieldCheck,
  FileClock
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import {
  filterApplicationsForUser,
  filterDocumentsForUser,
  filterEVCVisitsForUser,
  filterUndertakingsForUser
} from '../../../services/rbacService';
import { authService } from '../../../services/authService';
import { resolveWorkflowConfig } from '../../../workflow/config';
import {
  documentValidity,
  documentsForRenewal,
  validityLabel
} from '../../../workflow/documents';
import { applicationProgress, linkedVisitFor } from '../../../workflow/selectors';
import { applicationOverdueWindow } from '../../../workflow/sla';
import { STAGE_META, canonicalStage } from '../../../workflow/stages';
import { undertakingBucket } from '../../../workflow/undertakings';
import { formatDisplayDate, getNow, parseDate } from '../../../utils/dates';

const SLA_TONE: Record<string, string> = {
  'On Track': 'text-emerald-600',
  Approaching: 'text-amber-600',
  'Due Today': 'text-amber-700',
  Breached: 'text-rose-600',
  Paused: 'text-slate-500'
};

export const InstitutionAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications, documents, evcVisits, undertakings, institutes } = useApp();

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = getNow();

  const myApplications = filterApplicationsForUser(applications, user);
  const myDocuments = filterDocumentsForUser(documents, user);
  const myVisits = filterEVCVisitsForUser(evcVisits, user);
  const myUndertakings = filterUndertakingsForUser(undertakings, user);
  const institute = institutes.find((item) => item.id === user?.instituteId);
  const renewalQueue = documentsForRenewal(myDocuments, config.documentWarningDays, now);

  const activeApp =
    [...myApplications].sort(
      (a, b) => (parseDate(b.lastUpdated)?.getTime() ?? 0) - (parseDate(a.lastUpdated)?.getTime() ?? 0)
    )[0] ?? null;

  const activeVisit = activeApp ? linkedVisitFor(activeApp, myVisits) : undefined;
  const progressSteps = activeApp ? applicationProgress(activeApp) : [];
  const sla = activeApp ? applicationOverdueWindow(activeApp, config, now).tier : 'On Track';

  const submittedCount = myApplications.length;
  const underReviewCount = myApplications.filter(
    (app) => app.status === 'In Progress' || app.status === 'Pending'
  ).length;
  const approvedCount = myApplications.filter((app) => app.status === 'Approved').length;
  const correctionCount = myApplications.filter(
    (app) => app.status === 'Action Required' || app.status === 'Returned'
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/60 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
              <Building2 className="w-3 h-3" />
              <span>{user?.instituteName || institute?.name || 'Institution'}</span>
            </span>
            <span className="text-xs text-blue-200">AICTE PID: {user?.instituteId || 'Not linked'}</span>
            {institute && (
              <span className="text-xs text-emerald-300 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 inline" />
                <span>{institute.status}</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Institutional approval and compliance portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Track the approval lifecycle, answer regulatory queries, and keep statutory records current.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('/institution/apply')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Apply for new approval</span>
          </button>
          <button
            onClick={() => navigate('/institution/profile')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Institute profile</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/applications')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Submitted
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{submittedCount}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Applications submitted</div>
        </div>

        <div
          onClick={() => navigate('/institution/tracking')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              Under review
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{underReviewCount}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Applications under review</div>
        </div>

        <div
          onClick={() => navigate('/applications?status=Approved')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Granted
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{approvedCount}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Approved applications</div>
        </div>

        <div
          onClick={() => navigate('/applications?status=Action+Required')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Action required
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{correctionCount}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Pending corrections</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          {activeApp ? (
            <>
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {activeApp.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {activeApp.type}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 mt-1">Approval progress</h2>
                </div>
                <button
                  onClick={() => navigate('/institution/tracking')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold shrink-0"
                >
                  Full history
                </button>
              </div>

              <div className="relative pl-6 space-y-4 my-auto before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {progressSteps.map((step, idx) => {
                  const isDone = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  return (
                    <div key={`${step.stage}-${idx}`} className="relative flex items-start space-x-3 text-xs">
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isCurrent
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <span className="text-[9px] font-bold">{idx + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-bold ${
                              isDone
                                ? 'text-slate-800'
                                : isCurrent
                                  ? 'text-blue-700 font-extrabold'
                                  : 'text-slate-400'
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {step.date}
                          </span>
                        </div>
                        {isCurrent && step.note && (
                          <p className="text-[11px] text-blue-600 mt-0.5 font-medium leading-tight">
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Stage: {STAGE_META[canonicalStage(activeApp.stage)].label}</span>
                <span className={`font-semibold ${SLA_TONE[sla] ?? 'text-slate-500'}`}>{sla}</span>
              </div>
            </>
          ) : (
            <div className="my-auto py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No application on record</p>
              <p className="text-xs text-slate-500 mt-1">
                Submit an application to begin the approval lifecycle.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">EVC inspection</h2>
            </div>
            {activeVisit && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  activeVisit.status === 'Pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {activeVisit.status}
              </span>
            )}
          </div>

          {activeVisit ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5 text-xs my-auto">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Inspection date</span>
                <span className="font-bold text-slate-900">
                  {formatDisplayDate(activeVisit.date)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Mode</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {activeVisit.mode} inspection
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Committee</span>
                <span className="font-bold text-slate-800 text-right">{activeVisit.assignedCommittee}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Lead inspector</span>
                <span className="font-bold text-slate-800 text-right">
                  {activeVisit.committeeMembers[0] ?? 'Not yet nominated'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 leading-snug flex items-start space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Keep land title documents, fire safety clearance, and faculty appointment registers
                  ready for the committee.
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 my-auto py-6 text-center">
              No inspection has been scheduled for this institution.
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/documents')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Verify and upload required records</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileClock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Action required: document validity</h2>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              All documents ({myDocuments.length})
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            {renewalQueue.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Every statutory document is inside its validity window.</span>
              </div>
            ) : (
              renewalQueue.slice(0, 4).map((doc) => {
                const validity = documentValidity(doc, config.documentWarningDays, now);
                const urgent = validity.tier === 'Expired' || validity.tier === 'Critical';
                return (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{doc.title}</div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          urgent ? 'text-rose-600 font-semibold' : 'text-amber-700'
                        }`}
                      >
                        {formatDisplayDate(doc.expiryDate)} · {validityLabel(validity)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/documents')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
                        urgent ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {urgent ? 'Renew' : 'Review'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Undertakings on record</h2>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              All
            </button>
          </div>

          <div className="space-y-3 my-auto">
            {myUndertakings.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No time-bound undertakings have been recorded.
              </p>
            ) : (
              myUndertakings.slice(0, 3).map((item) => {
                const bucket = undertakingBucket(item, config, now);
                const tone =
                  bucket === 'Verified'
                    ? 'bg-emerald-100 text-emerald-700'
                    : bucket === 'Rejected'
                      ? 'bg-rose-100 text-rose-700'
                      : bucket === 'Overdue'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Evidence due {formatDisplayDate(item.dueDate)}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${tone}`}>
                      {bucket}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/compliance')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Submit required undertakings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

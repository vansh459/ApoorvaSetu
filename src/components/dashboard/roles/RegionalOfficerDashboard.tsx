import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Send,
  AlertTriangle,
  Calendar,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import {
  filterApplicationsForUser,
  filterDocumentsForUser,
  filterEVCVisitsForUser,
  filterInstitutesForUser,
  filterUndertakingsForUser
} from '../../../services/rbacService';
import { authService } from '../../../services/authService';
import { resolveWorkflowConfig } from '../../../workflow/config';
import {
  complianceSnapshot,
  evcQueueSummary,
  isReportOverdue,
  stagePendency
} from '../../../workflow/selectors';
import { canonicalStage } from '../../../workflow/stages';
import { regionalOffices } from '../../../data/initialData';
import { formatDisplayDate, getNow, parseDate } from '../../../utils/dates';

export const RegionalOfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications, evcVisits, documents, undertakings, institutes } = useApp();

  const userRegion = user?.region || 'Northern';
  const systemConfig = authService.getSystemConfig();
  const config = resolveWorkflowConfig(systemConfig);
  const now = getNow();

  const regionalApps = filterApplicationsForUser(applications, user);
  const regionalVisits = filterEVCVisitsForUser(evcVisits, user);
  const regionalDocuments = filterDocumentsForUser(documents, user);
  const regionalUndertakings = filterUndertakingsForUser(undertakings, user);
  const regionalInstitutes = filterInstitutesForUser(institutes, user);

  const regionalOffice = regionalOffices.find((office) => office.region === userRegion);
  const jurisdictionStates = [...new Set(regionalInstitutes.map((institute) => institute.state))].sort();

  const activeApps = regionalApps.filter((app) => app.status !== 'Approved' && app.status !== 'Rejected');
  const totalRegional = regionalApps.length;
  const underScrutiny = activeApps.filter((app) => {
    const stage = canonicalStage(app.stage);
    return stage === 'Submitted' || stage === 'Scrutiny / Re-scrutiny';
  }).length;
  const forwardedApps = activeApps.filter((app) => {
    const stage = canonicalStage(app.stage);
    return stage !== 'Submitted' && stage !== 'Scrutiny / Re-scrutiny';
  }).length;
  const requiringCorrection = regionalApps.filter(
    (app) =>
      app.status === 'Action Required' ||
      app.status === 'Returned' ||
      (app.deficiencies ?? []).some((deficiency) => !deficiency.resolvedAt)
  ).length;
  const activeVisits = evcQueueSummary(regionalVisits, config, now).scheduled;

  const regionalStages = stagePendency(regionalApps, config, now).filter((row) => row.count > 0);

  const visitQueue = regionalVisits
    .filter((visit) => visit.status === 'Scheduled' || visit.status === 'Pending')
    .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0))
    .slice(0, 4);

  const pendingDocuments = regionalDocuments.filter((doc) => doc.status === 'Pending').slice(0, 4);

  const snapshot = complianceSnapshot(regionalUndertakings, regionalDocuments, config, now);
  const verifiedShare =
    snapshot.undertakings.total === 0
      ? 0
      : Math.round((snapshot.undertakings.verified / snapshot.undertakings.total) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 border border-teal-800/60 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>
                {userRegion} Regional Office
                {regionalOffice?.headquarters ? ` (${regionalOffice.headquarters})` : ''}
              </span>
            </span>
            <span className="text-xs text-teal-200">
              Jurisdiction: {jurisdictionStates.length ? jurisdictionStates.join(', ') : 'No institutions mapped'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Regional applications and inspection operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Verify documents, coordinate expert visits, and forward compliant cases to the competent authority.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('/documents')}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Verify documents</span>
          </button>
          <button
            onClick={() => navigate('/regional/escalations')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Escalate issue</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => navigate('/applications')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {userRegion}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {totalRegional.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Regional applications</div>
        </div>

        <div
          onClick={() => navigate('/applications?stage=Scrutiny+%2F+Re-scrutiny')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              In review
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{underScrutiny}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Under scrutiny</div>
        </div>

        <div
          onClick={() => navigate('/applications?stage=Expert+Visit+Committee+(EVC)')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Send className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
              Forwarded
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{forwardedApps}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Forwarded for inspection or approval</div>
        </div>

        <div
          onClick={() => navigate('/applications?status=Action+Required')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Deficiencies
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{requiringCorrection}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Requiring correction</div>
        </div>

        <div
          onClick={() => navigate('/evc-scheduling')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Inspections
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{activeVisits}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Active EVC visits</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Stage pendency in {userRegion}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">AY {systemConfig.academicYear}</span>
          </div>

          {regionalStages.length === 0 ? (
            <p className="text-xs text-slate-500 my-auto py-6 text-center">
              No cases are pending in this jurisdiction.
            </p>
          ) : (
            <div className="space-y-3 my-auto">
              {regionalStages.map((stage) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{stage.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {stage.count}{' '}
                      <span className="font-normal text-slate-400">({stage.share}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(stage.share, 3)}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Scheduled EVC visits</h2>
            </div>
            <button
              onClick={() => navigate('/evc-scheduling')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              All visits
            </button>
          </div>

          {visitQueue.length === 0 ? (
            <p className="text-xs text-slate-500 my-auto py-6 text-center">
              No inspections are scheduled in this region.
            </p>
          ) : (
            <div className="space-y-2.5 my-auto">
              {visitQueue.map((visit) => {
                const date = parseDate(visit.date);
                const day = date ? String(date.getDate()).padStart(2, '0') : visit.displayDate.day;
                const month = date
                  ? date.toLocaleString('en-US', { month: 'short' })
                  : visit.displayDate.month;
                const overdue = isReportOverdue(visit, config, now);
                return (
                  <div
                    key={visit.id}
                    onClick={() => navigate('/evc-scheduling')}
                    className="p-2.5 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex flex-col items-center justify-center font-bold text-[10px] leading-tight shrink-0">
                        <span>{day}</span>
                        <span className="text-[8px] font-semibold">{month}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 leading-tight truncate">
                          {visit.instituteName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {visit.stateRegion}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        overdue
                          ? 'bg-rose-50 text-rose-700'
                          : visit.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {overdue ? 'Report overdue' : visit.status === 'Pending' ? 'Panel pending' : 'Scheduled'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Document verification queue</h2>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
            >
              Verify documents
            </button>
          </div>

          {pendingDocuments.length === 0 ? (
            <p className="text-xs text-slate-500 my-auto py-6 text-center">
              No documents are waiting for verification.
            </p>
          ) : (
            <div className="space-y-2.5 my-auto">
              {pendingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/documents')}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3 text-xs hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{doc.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {doc.instituteName} · uploaded {formatDisplayDate(doc.uploadDate)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pending
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Regional compliance</h2>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              All
            </button>
          </div>

          <div className="space-y-3 my-auto">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-emerald-950">Verified undertakings</div>
                <div className="text-[10px] text-emerald-700">
                  {snapshot.undertakings.verified} of {snapshot.undertakings.total} recorded
                </div>
              </div>
              <span className="text-base font-black text-emerald-700">{verifiedShare}%</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-amber-950">Open undertakings</div>
                <div className="text-[10px] text-amber-700">
                  {snapshot.undertakings.submitted} evidence awaiting verification
                </div>
              </div>
              <span className="text-base font-black text-amber-700">{snapshot.undertakings.open}</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-rose-950">Expired documents</div>
                <div className="text-[10px] text-rose-700">
                  {snapshot.documents.expiringSoon} expiring soon
                </div>
              </div>
              <span className="text-base font-black text-rose-700">{snapshot.documents.expired}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/compliance')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
            >
              <span>Manage regional compliance</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

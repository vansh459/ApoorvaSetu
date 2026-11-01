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
import { DashboardScaffold } from '../DashboardScaffold';
import { Badge, Button, Card, EmptyState, ProgressBar } from '../../ui';

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
    <DashboardScaffold
      title="Regional operations"
      description="Verify documents, coordinate expert visits and forward compliant cases to the competent authority."
      meta={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/60 px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            {userRegion} Regional Office
            {regionalOffice?.headquarters ? `, ${regionalOffice.headquarters}` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/60 px-2.5 py-1">
            {jurisdictionStates.length ? jurisdictionStates.join(', ') : 'No institutions mapped'}
          </span>
        </>
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/regional/escalations')}>
            Escalations
          </Button>
          <Button onClick={() => navigate('/documents')}>Verify documents</Button>
        </>
      }
      stats={[
        {
          label: 'Regional applications',
          value: totalRegional.toLocaleString(),
          delta: userRegion,
          icon: FileText,
          onClick: () => navigate('/applications')
        },
        {
          label: 'Under scrutiny',
          value: underScrutiny,
          delta: 'In review',
          icon: Clock,
          onClick: () => navigate('/applications?stage=Scrutiny+%2F+Re-scrutiny')
        },
        {
          label: 'Forwarded',
          value: forwardedApps,
          delta: 'For inspection or approval',
          icon: Send,
          onClick: () => navigate('/applications?stage=Expert+Visit+Committee+(EVC)')
        },
        {
          label: 'Requiring correction',
          value: requiringCorrection,
          delta: 'Deficiencies',
          icon: AlertTriangle,
          onClick: () => navigate('/applications?status=Action+Required')
        },
        {
          label: 'Active EVC visits',
          value: activeVisits,
          delta: 'Inspections',
          icon: Calendar,
          onClick: () => navigate('/evc-scheduling')
        }
      ]}
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileText className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Stage pendency in {userRegion}</h2>
            </div>
            <span className="shrink-0 text-xs text-ink-2">AY {systemConfig.academicYear}</span>
          </div>

          {regionalStages.length === 0 ? (
            <EmptyState
              title="No pending cases"
              description="No cases are pending in this jurisdiction."
              className="py-10"
            />
          ) : (
            <div className="my-auto space-y-4 px-5 py-5">
              {regionalStages.map((stage) => (
                <div key={stage.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-ink">{stage.label}</span>
                    <span className="shrink-0 tabular-nums text-ink-2">
                      <span className="font-semibold text-ink">{stage.count}</span> ({stage.share}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={stage.share}
                    label={`${stage.label}: ${stage.count}`}
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Scheduled EVC visits</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/evc-scheduling')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              All visits
            </button>
          </div>

          {visitQueue.length === 0 ? (
            <EmptyState
              title="No visits scheduled"
              description="No inspections are scheduled in this region."
              className="py-10"
            />
          ) : (
            <div className="my-auto space-y-1 px-3 py-3">
              {visitQueue.map((visit) => {
                const date = parseDate(visit.date);
                const day = date ? String(date.getDate()).padStart(2, '0') : visit.displayDate.day;
                const month = date
                  ? date.toLocaleString('en-US', { month: 'short' })
                  : visit.displayDate.month;
                const overdue = isReportOverdue(visit, config, now);
                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => navigate('/evc-scheduling')}
                    className="flex w-full min-w-0 items-center justify-between gap-3 rounded-control p-2 text-left transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-control bg-surface-2 text-center">
                        <span className="text-sm font-semibold leading-none text-ink">{day}</span>
                        <span className="mt-1 text-xs leading-none text-ink-2">{month}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium leading-tight text-ink">
                          {visit.instituteName}
                        </div>
                        <div className="truncate text-xs text-ink-2">{visit.stateRegion}</div>
                      </div>
                    </div>
                    <Badge
                      size="sm"
                      tone={overdue ? 'danger' : visit.status === 'Pending' ? 'warning' : 'success'}
                    >
                      {overdue ? 'Report overdue' : visit.status === 'Pending' ? 'Panel pending' : 'Scheduled'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileCheck className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Document verification queue</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              Verify
            </button>
          </div>

          {pendingDocuments.length === 0 ? (
            <EmptyState
              title="Nothing to verify"
              description="No documents are waiting for verification."
              className="py-10"
            />
          ) : (
            <div className="my-auto space-y-1 px-3 py-3">
              {pendingDocuments.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => navigate('/documents')}
                  className="flex w-full items-center justify-between gap-3 rounded-control p-3 text-left transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{doc.title}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-2">
                      {doc.instituteName}, uploaded {formatDisplayDate(doc.uploadDate)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="warning" size="sm">
                      Pending
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-4">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Regional compliance</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/compliance')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              All
            </button>
          </div>

          <div className="my-auto space-y-2.5 px-5 py-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-ink">Verified undertakings</div>
                <div className="text-xs text-ink-2">
                  {snapshot.undertakings.verified} of {snapshot.undertakings.total} recorded
                </div>
              </div>
              <span className="font-semibold tabular-nums text-ink">{verifiedShare}%</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
              <div>
                <div className="font-medium text-ink">Open undertakings</div>
                <div className="text-xs text-ink-2">
                  {snapshot.undertakings.submitted} evidence awaiting verification
                </div>
              </div>
              <span className="font-semibold tabular-nums text-ink">{snapshot.undertakings.open}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
              <div>
                <div className="font-medium text-ink">Expired documents</div>
                <div className="text-xs text-ink-2">
                  {snapshot.documents.expiringSoon} expiring soon
                </div>
              </div>
              <span className="font-semibold tabular-nums text-ink">{snapshot.documents.expired}</span>
            </div>
          </div>

          <div className="border-t border-line px-5 py-4">
            <Button
              fullWidth
              onClick={() => navigate('/compliance')}
            >
              Manage regional compliance
            </Button>
          </div>
        </Card>
      </div>
    </DashboardScaffold>
  );
};

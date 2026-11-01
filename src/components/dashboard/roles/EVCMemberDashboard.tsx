import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { filterEVCVisitsForUser } from '../../../services/rbacService';
import { authService } from '../../../services/authService';
import { resolveWorkflowConfig } from '../../../workflow/config';
import { evcQueueSummary, isReportOverdue, pendingReports } from '../../../workflow/selectors';
import { formatDisplayDate, getNow, parseDate } from '../../../utils/dates';
import { DashboardScaffold } from '../DashboardScaffold';
import { Badge, Button, Card, EmptyState } from '../../ui';

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
    <DashboardScaffold
      title="Inspection workspace"
      description="Conduct facility audits, record checklist findings, attach evidence and submit the inspection report."
      meta={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 px-2.5 py-1">
          <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          {user?.committeeName || 'Expert Visit Committee'}, {user?.name}
        </span>
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/evc/my-visits')}>
            My visits
          </Button>
          <Button onClick={() => navigate('/evc/checklist')}>Inspection checklist</Button>
        </>
      }
      stats={[
        {
          label: 'Assigned visits',
          value: assignedVisits.length,
          icon: Calendar,
          onClick: () => navigate('/evc/my-visits')
        },
        {
          label: 'Upcoming inspections',
          value: summary.scheduled,
          icon: Clock,
          onClick: () => navigate('/evc/my-visits')
        },
        {
          label: 'Reports outstanding',
          value: reportQueue.length,
          delta: `${overdueCount} overdue`,
          icon: AlertCircle,
          onClick: () => navigate('/evc/my-visits')
        },
        {
          label: 'Completed inspections',
          value: summary.completed,
          icon: CheckCircle2,
          onClick: () => navigate('/evc/my-visits')
        }
      ]}
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Assigned inspection visits</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/evc/my-visits')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              All my visits
            </button>
          </div>

          {schedule.length === 0 ? (
            <EmptyState
              title="No assigned visits"
              description="No inspection visits are assigned to this committee."
              className="py-10"
            />
          ) : (
            <div className="my-auto space-y-1 px-3 py-3">
              {schedule.map((visit) => {
                const overdue = isReportOverdue(visit, config, now);
                const active = visit.status === 'Scheduled' || visit.status === 'Pending';
                return (
                  <div
                    key={visit.id}
                    className="flex flex-col justify-between gap-3 rounded-control p-3 text-sm transition-colors duration-150 hover:bg-surface-2 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-ink">{visit.instituteName}</span>
                        <Badge
                          size="sm"
                          tone={
                            overdue
                              ? 'danger'
                              : visit.status === 'Completed'
                                ? 'success'
                                : visit.status === 'Pending'
                                  ? 'warning'
                                  : 'info'
                          }
                        >
                          {overdue ? 'Report overdue' : visit.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" strokeWidth={1.75} />
                          {formatDisplayDate(visit.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" strokeWidth={1.75} />
                          {visit.stateRegion}
                        </span>
                        <span>{visit.mode} inspection</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {active ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => navigate('/evc/checklist')}>
                            Checklist
                          </Button>
                          <Button size="sm" onClick={() => navigate('/evc/my-visits')}>
                            Submit report
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/evc/my-visits')}
                        >
                          View record
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Next report due</h2>
            </div>
            {reportDue && isReportOverdue(reportDue, config, now) && (
              <Badge tone="danger" size="sm">
                Overdue
              </Badge>
            )}
          </div>

          {reportDue ? (
            <div className="my-auto space-y-3 px-5 py-5">
              <div>
                <div className="font-medium text-ink">
                  {reportDue.instituteName}{' '}
                  <span className="text-ink-2">({reportDue.applicationId})</span>
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-ink-2">
                  <div>Inspection date: {formatDisplayDate(reportDue.date)}</div>
                  {reportDue.reportDueAt && <div>Report due: {formatDisplayDate(reportDue.reportDueAt)}</div>}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-2">
                Submit the completed checklist, evidence and signed recommendation to clear this case.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => navigate('/evc/my-visits')}>Submit report</Button>
                <Button variant="secondary" onClick={() => navigate('/evc/evidence')}>
                  Upload evidence
                </Button>
              </div>
            </div>
          ) : (
            <div className="my-auto px-5 py-8 text-center text-sm text-ink-2">
              No inspection reports are outstanding.
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-line px-5 py-3 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} />
              Scoped to assigned committee
            </span>
            <span>AY {systemConfig.academicYear}</span>
          </div>
        </Card>
      </div>
    </DashboardScaffold>
  );
};

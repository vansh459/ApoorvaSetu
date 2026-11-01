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
import { documentValidity, documentsForRenewal, validityLabel } from '../../../workflow/documents';
import { applicationProgress, linkedVisitFor } from '../../../workflow/selectors';
import { applicationOverdueWindow } from '../../../workflow/sla';
import { STAGE_META, canonicalStage } from '../../../workflow/stages';
import { undertakingBucket } from '../../../workflow/undertakings';
import { formatDisplayDate, getNow, parseDate } from '../../../utils/dates';
import { statusTone } from '../../../utils/statusTone';
import { DashboardScaffold } from '../DashboardScaffold';
import { Badge, Button, Card, EmptyState } from '../../ui';

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
    <DashboardScaffold
      title="Institutional portal"
      description="Track the approval lifecycle, answer regulatory queries and keep statutory records current."
      meta={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/60 px-2.5 py-1">
            <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            {user?.instituteName || institute?.name || 'Institution'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/60 px-2.5 py-1">
            AICTE PID {user?.instituteId || 'Not linked'}
          </span>
          {institute && (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/60 px-2.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={1.75} />
              {institute.status}
            </span>
          )}
        </>
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/institution/profile')}>
            Institute profile
          </Button>
          <Button onClick={() => navigate('/institution/apply')}>Apply for approval</Button>
        </>
      }
      stats={[
        {
          label: 'Applications submitted',
          value: submittedCount,
          icon: FileText,
          onClick: () => navigate('/applications')
        },
        {
          label: 'Under review',
          value: underReviewCount,
          icon: Clock,
          onClick: () => navigate('/institution/tracking')
        },
        {
          label: 'Approved applications',
          value: approvedCount,
          icon: CheckCircle2,
          onClick: () => navigate('/applications?status=Approved')
        },
        {
          label: 'Pending corrections',
          value: correctionCount,
          icon: AlertTriangle,
          onClick: () => navigate('/applications?status=Action+Required')
        }
      ]}
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-7">
          {activeApp ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info" size="sm">
                      {activeApp.id}
                    </Badge>
                    <span className="truncate text-xs text-ink-2">{activeApp.type}</span>
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-ink">Approval progress</h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/institution/tracking')}
                  className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
                >
                  Full history
                </button>
              </div>

              <div className="relative my-auto space-y-4 py-5 pl-9 pr-5 before:absolute before:bottom-7 before:left-[1.4rem] before:top-7 before:w-px before:bg-line">
                {progressSteps.map((step, idx) => {
                  const isDone = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  return (
                    <div key={`${step.stage}-${idx}`} className="relative">
                      <div
                        className={`absolute -left-[1.85rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-pill border text-xs font-semibold ${
                          isDone
                            ? 'border-success bg-success text-white'
                            : isCurrent
                              ? 'border-accent bg-accent text-white'
                              : 'border-line-strong bg-surface text-ink-3'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> : idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm ${
                              isDone
                                ? 'font-medium text-ink'
                                : isCurrent
                                  ? 'font-semibold text-accent'
                                  : 'text-ink-2'
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="shrink-0 text-xs text-ink-2">{step.date}</span>
                        </div>
                        {isCurrent && step.note && (
                          <p className="mt-0.5 text-xs leading-tight text-ink-2">{step.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-line px-5 py-3 text-xs text-ink-2">
                <span>Stage: {STAGE_META[canonicalStage(activeApp.stage)].label}</span>
                <Badge tone={statusTone(sla)} size="sm">
                  {sla}
                </Badge>
              </div>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="No application on record"
              description="Submit an application to begin the approval lifecycle."
              className="py-16"
            />
          )}
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">EVC inspection</h2>
            </div>
            {activeVisit && (
              <Badge tone={statusTone(activeVisit.status)} size="sm">
                {activeVisit.status}
              </Badge>
            )}
          </div>

          {activeVisit ? (
            <div className="my-auto space-y-2.5 px-5 py-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-2">Inspection date</span>
                <span className="font-medium text-ink">{formatDisplayDate(activeVisit.date)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <span className="text-ink-2">Mode</span>
                <span className="font-medium text-ink">{activeVisit.mode} inspection</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <span className="text-ink-2">Committee</span>
                <span className="text-right font-medium text-ink">
                  {activeVisit.assignedCommittee}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <span className="text-ink-2">Lead inspector</span>
                <span className="text-right font-medium text-ink">
                  {activeVisit.committeeMembers[0] ?? 'Not yet nominated'}
                </span>
              </div>

              <p className="flex items-start gap-1.5 border-t border-line pt-3 text-xs leading-relaxed text-ink-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                <span>
                  Keep land title documents, fire safety clearance and faculty appointment registers
                  ready for the committee.
                </span>
              </p>
            </div>
          ) : (
            <EmptyState
              title="No inspection scheduled"
              description="No inspection has been scheduled for this institution."
              className="py-12"
            />
          )}

          <div className="mt-auto border-t border-line px-5 py-4">
            <Button
              fullWidth
              variant="secondary"
              onClick={() => navigate('/documents')}
              icon={<Upload className="h-4 w-4" strokeWidth={1.75} />}
            >
              Upload required records
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileClock className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Document validity</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              All documents ({myDocuments.length})
            </button>
          </div>

          <div className="my-auto space-y-1 px-3 py-3">
            {renewalQueue.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-ink-2">
                Every statutory document is inside its validity window.
              </p>
            ) : (
              renewalQueue.slice(0, 4).map((doc) => {
                const validity = documentValidity(doc, config.documentWarningDays, now);
                const urgent = validity.tier === 'Expired' || validity.tier === 'Critical';
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-control p-3 text-sm transition-colors duration-150 hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{doc.title}</div>
                      <div className={`mt-0.5 text-xs ${urgent ? 'text-danger' : 'text-ink-2'}`}>
                        {formatDisplayDate(doc.expiryDate)}, {validityLabel(validity)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={urgent ? 'primary' : 'secondary'}
                      onClick={() => navigate('/documents')}
                      className="shrink-0"
                    >
                      {urgent ? 'Renew' : 'Review'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Undertakings on record</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/compliance')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              All
            </button>
          </div>

          <div className="my-auto space-y-2 px-5 py-5">
            {myUndertakings.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-2">
                No time-bound undertakings have been recorded.
              </p>
            ) : (
              myUndertakings.slice(0, 3).map((item) => {
                const bucket = undertakingBucket(item, config, now);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{item.title}</div>
                      <div className="mt-0.5 text-xs text-ink-2">
                        Evidence due {formatDisplayDate(item.dueDate)}
                      </div>
                    </div>
                    <Badge tone={statusTone(bucket)} size="sm">
                      {bucket}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-auto border-t border-line px-5 py-4">
            <Button
              fullWidth
              onClick={() => navigate('/compliance')}
            >
              Submit required undertakings
            </Button>
          </div>
        </Card>
      </div>
    </DashboardScaffold>
  );
};

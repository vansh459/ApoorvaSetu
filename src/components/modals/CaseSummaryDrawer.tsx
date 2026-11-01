import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCopy,
  FileText,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { resolveWorkflowConfig } from '../../workflow/config';
import { routeForApplication } from '../../workflow/routes';
import {
  applicationAgeDays,
  applicationProgress,
  linkedVisitFor
} from '../../workflow/selectors';
import { applicationOverdueWindow } from '../../workflow/sla';
import { documentValidity, isActiveDocument, validityLabel } from '../../workflow/documents';
import { undertakingBucket } from '../../workflow/undertakings';
import {
  TEMPLATE_KINDS,
  communicationTemplate
} from '../../workflow/templates';
import type { TemplateKind } from '../../workflow/templates';
import { formatDisplayDate, getNow } from '../../utils/dates';
import { statusTone } from '../../utils/statusTone';
import { Badge, Button, Drawer } from '../ui';

export const CaseSummaryDrawer: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    selectedApplication: app,
    evcVisits,
    undertakings,
    documents,
    showToast
  } = useApp();
  const { user } = useAuth();
  const [templateKind, setTemplateKind] = useState<TemplateKind>('reminder');

  const isOpen = activeModal === 'case-summary' && Boolean(app);
  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = useMemo(() => getNow(), [app?.id]);

  if (!isOpen || !app) return null;

  const route = routeForApplication(app);
  const sla = applicationOverdueWindow(app, config, now);
  const age = applicationAgeDays(app, now);
  const steps = applicationProgress(app);
  const visit = linkedVisitFor(app, evcVisits);
  const report = visit?.report;
  const appUndertakings = undertakings.filter((item) => item.applicationId === app.id);
  const riskDocuments = documents
    .filter((document) => document.instituteId === app.instituteId && isActiveDocument(document))
    .map((document) => ({ document, validity: documentValidity(document, config.documentWarningDays, now) }))
    .filter(({ validity }) => validity.tier !== 'Valid')
    .sort((a, b) => a.validity.daysLeft - b.validity.daysLeft);
  const template = communicationTemplate(templateKind, app, {
    officer: user?.name ?? 'Authorised officer',
    config,
    now
  });

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(`${template.subject}\n\n${template.body}`);
      showToast(`${template.title} copied to clipboard`, 'success');
    } catch {
      showToast('Clipboard unavailable in this browser', 'error');
    }
  };

  const sectionTitle = (title: string, icon?: React.ReactNode) => (
    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
      {icon}
      {title}
    </h3>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      label={`Case summary for ${app.id}`}
      header={
        <div className="min-w-0">
          <p className="text-xs text-ink-2">Case summary</p>
          <div className="mt-0.5 flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{app.id}</h2>
            <Badge tone={statusTone(app.status)}>{app.status}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-2">
            {app.instituteName}, {app.region} Region
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="primary" size="sm" icon={<ClipboardCopy className="h-4 w-4" />} onClick={copyTemplate}>
            Copy draft
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-5 py-5 text-sm sm:px-6">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[
            { label: 'Application type', value: app.type },
            { label: 'Route', value: route.label },
            { label: 'Current stage', value: app.stage },
            { label: 'Status', value: app.status },
            { label: 'Applied on', value: formatDisplayDate(app.appliedDate) },
            { label: 'Days in stage', value: `${age}` }
          ].map((item) => (
            <div key={item.label} className="rounded-card bg-surface-2 p-2.5">
              <div className="text-xs text-ink-2">{item.label}</div>
              <div className="mt-0.5 break-words text-sm font-semibold text-ink">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(sla.tier)}>{sla.tier}</Badge>
          <span className="text-sm text-ink-2">
            Stage due {sla.dueAt ? formatDisplayDate(sla.dueAt) : 'not recorded'},{' '}
            {sla.daysRemaining >= 0
              ? `${sla.daysRemaining} day(s) remaining`
              : `${sla.daysOverdue} day(s) overdue`}
          </span>
        </section>

        <section>
          {sectionTitle('Route progress')}
          <ol className="space-y-1.5">
            {steps.map((step) => (
              <li key={`${step.stage}-${step.date}`} className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    step.status === 'completed'
                      ? 'bg-success'
                      : step.status === 'current'
                        ? 'bg-accent'
                        : 'bg-line-strong'
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-semibold text-ink">{step.title}</span>
                  <span className="text-ink-2">, {step.date}</span>
                  {step.note && (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{step.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          {sectionTitle('Deficiencies', <AlertTriangle className="h-4 w-4 text-warning" />)}
          {(app.deficiencies ?? []).length === 0 ? (
            <p className="text-sm text-ink-2">None recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {(app.deficiencies ?? []).map((item) => (
                <li key={`${item.code}-${item.raisedAt}`} className="rounded-card bg-surface-2 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{item.code}</span>
                    <Badge tone={item.resolvedAt ? 'success' : 'danger'}>
                      {item.resolvedAt ? 'Resolved' : 'Open'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">{item.note}</p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {item.stage}, raised {formatDisplayDate(item.raisedAt)} by {item.raisedBy}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(app.returns ?? []).length > 0 && (
          <section>
            {sectionTitle('Returns')}
            <ul className="space-y-1.5">
              {(app.returns ?? []).map((item) => (
                <li key={`${item.code}-${item.at}`} className="rounded-card bg-surface-2 p-2.5">
                  <p className="font-semibold text-ink">
                    {item.fromStage} to {item.toStage}, {item.code}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-2">{item.note}</p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {formatDisplayDate(item.at)} by {item.by}
                    {item.resubmittedAt ? `, resubmitted ${formatDisplayDate(item.resubmittedAt)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          {sectionTitle('Decision')}
          {app.decision ? (
            <div className="rounded-card bg-surface-2 p-2.5">
              <p className="font-semibold text-ink">
                {app.decision.outcome}, {app.decision.code}
              </p>
              <p className="mt-0.5 text-sm text-ink-2">{app.decision.note}</p>
              <p className="mt-1 text-xs text-ink-2">
                Competent authority: {app.decision.competentAuthority},{' '}
                {formatDisplayDate(app.decision.at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-2">
              No decision recorded. Approval or rejection requires a competent authority.
            </p>
          )}
        </section>

        <section>
          {sectionTitle('Expert visit', <CalendarDays className="h-4 w-4 text-ink-2" />)}
          {visit ? (
            <div className="rounded-card bg-surface-2 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(visit.status)}>{visit.status}</Badge>
                <span className="font-semibold text-ink">{visit.assignedCommittee}</span>
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {formatDisplayDate(visit.scheduledAt ?? visit.date)}, {visit.mode},{' '}
                {visit.reportSubmitted ? 'Report submitted' : 'Report pending'}
              </p>
              {report && (
                <div className="mt-1.5 space-y-0.5 text-sm text-ink-2">
                  <p>
                    Recommendation: <strong className="text-ink">{report.recommendations}</strong>
                  </p>
                  <p>
                    Scores: infrastructure {report.infrastructureScore}, faculty {report.facultyScore},
                    labs {report.labScore}; safety {report.safetyCompliance ? 'compliant' : 'not compliant'}.
                  </p>
                  <p>{report.remarks}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-2">No expert visit linked to this case.</p>
          )}
        </section>

        <section>
          {sectionTitle('Undertakings', <ShieldCheck className="h-4 w-4 text-ink-2" />)}
          {appUndertakings.length === 0 ? (
            <p className="text-sm text-ink-2">No undertakings attached.</p>
          ) : (
            <ul className="space-y-1.5">
              {appUndertakings.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-card bg-surface-2 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-ink-2">
                      Due {formatDisplayDate(item.dueDate)}
                      {item.verifiedBy ? `, verified by ${item.verifiedBy}` : ''}
                    </p>
                  </div>
                  <Badge tone={statusTone(undertakingBucket(item, config, now))}>
                    {undertakingBucket(item, config, now)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {riskDocuments.length > 0 && (
          <section>
            {sectionTitle('Documents needing attention', <FileText className="h-4 w-4 text-ink-2" />)}
            <ul className="space-y-1.5">
              {riskDocuments.slice(0, 6).map(({ document, validity }) => (
                <li key={document.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-ink">{document.title}</span>
                  <span className="shrink-0 text-xs font-medium text-danger">
                    {validityLabel(validity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-card border border-line p-3.5">
          {sectionTitle('Communication drafts')}
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_KINDS.map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant={templateKind === kind ? 'primary' : 'secondary'}
                aria-pressed={templateKind === kind}
                onClick={() => setTemplateKind(kind)}
              >
                {communicationTemplate(kind, app, {
                  officer: user?.name ?? 'Authorised officer',
                  config,
                  now
                }).title}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">{template.subject}</p>
          <pre className="mt-1.5 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-control border border-line bg-surface-2 p-3 font-sans text-sm leading-relaxed text-ink-2">
            {template.body}
          </pre>
        </section>
      </div>
    </Drawer>
  );
};

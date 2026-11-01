import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCopy,
  FileText,
  Printer,
  ShieldCheck,
  X
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
import type { SlaTier } from '../../types';

const SLA_TONE: Record<SlaTier, string> = {
  'On Track': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Approaching: 'bg-amber-50 text-amber-700 border-amber-200',
  'Due Today': 'bg-orange-50 text-orange-700 border-orange-200',
  Breached: 'bg-rose-50 text-rose-700 border-rose-200',
  Paused: 'bg-slate-100 text-slate-600 border-slate-200'
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

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
  const closeRef = useRef<HTMLButtonElement>(null);
  const [templateKind, setTemplateKind] = useState<TemplateKind>('reminder');

  const isOpen = activeModal === 'case-summary' && Boolean(app);
  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = useMemo(() => getNow(), [app?.id]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setActiveModal]);

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

  return (
    <div className="case-summary-shell fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={() => setActiveModal(null)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Case summary for ${app.id}`}
        data-case-summary
        className="case-summary-drawer absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500">Case summary</p>
            <h2 className="text-base font-bold text-slate-900 truncate">{app.id}</h2>
            <p className="text-xs text-slate-500 truncate">
              {app.instituteName} · {app.region} Region
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer ${focusRing}`}
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              ref={closeRef}
              onClick={() => setActiveModal(null)}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer ${focusRing}`}
              aria-label="Close case summary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
          <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: 'Application type', value: app.type },
              { label: 'Route', value: route.label },
              { label: 'Current stage', value: app.stage },
              { label: 'Status', value: app.status },
              { label: 'Applied on', value: formatDisplayDate(app.appliedDate) },
              { label: 'Days in stage', value: `${age}` }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <div className="text-[10px] font-semibold text-slate-500">{item.label}</div>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5 break-words">
                  {item.value}
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SLA_TONE[sla.tier]}`}
            >
              {sla.tier}
            </span>
            <span className="text-[11px] text-slate-600">
              Stage due {sla.dueAt ? formatDisplayDate(sla.dueAt) : 'not recorded'} ·{' '}
              {sla.daysRemaining >= 0
                ? `${sla.daysRemaining} day(s) remaining`
                : `${sla.daysOverdue} day(s) overdue`}
            </span>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Route progress</h3>
            <ol className="space-y-1.5">
              {steps.map((step) => (
                <li key={`${step.stage}-${step.date}`} className="flex items-start gap-2">
                  <span
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-emerald-500'
                        : step.status === 'current'
                          ? 'bg-blue-600'
                          : 'bg-slate-300'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800">{step.title}</span>
                    <span className="text-slate-500"> · {step.date}</span>
                    {step.note && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{step.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Deficiencies
            </h3>
            {(app.deficiencies ?? []).length === 0 ? (
              <p className="text-[11px] text-slate-500">None recorded.</p>
            ) : (
              <ul className="space-y-1.5">
                {(app.deficiencies ?? []).map((item) => (
                  <li key={`${item.code}-${item.raisedAt}`} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{item.code}</span>
                      <span
                        className={`text-[10px] font-semibold ${
                          item.resolvedAt ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.resolvedAt ? 'Resolved' : 'Open'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.note}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.stage} · raised {formatDisplayDate(item.raisedAt)} by {item.raisedBy}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(app.returns ?? []).length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold text-slate-800 mb-2">Returns</h3>
              <ul className="space-y-1.5">
                {(app.returns ?? []).map((item) => (
                  <li key={`${item.code}-${item.at}`} className="rounded-lg border border-slate-200 p-2">
                    <p className="font-semibold text-slate-800">
                      {item.fromStage} → {item.toStage} · {item.code}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.note}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDisplayDate(item.at)} by {item.by}
                      {item.resubmittedAt ? ` · resubmitted ${formatDisplayDate(item.resubmittedAt)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Decision</h3>
            {app.decision ? (
              <div className="rounded-lg border border-slate-200 p-2.5">
                <p className="font-semibold text-slate-800">
                  {app.decision.outcome} · {app.decision.code}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">{app.decision.note}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Competent authority: {app.decision.competentAuthority} ·{' '}
                  {formatDisplayDate(app.decision.at)}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                No decision recorded. Approval or rejection requires a competent authority.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              Expert visit
            </h3>
            {visit ? (
              <div className="rounded-lg border border-slate-200 p-2.5">
                <p className="font-semibold text-slate-800">
                  {visit.status} · {visit.assignedCommittee}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {formatDisplayDate(visit.scheduledAt ?? visit.date)} · {visit.mode} ·{' '}
                  {visit.reportSubmitted ? 'Report submitted' : 'Report pending'}
                </p>
                {report && (
                  <div className="mt-1.5 text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      Recommendation: <strong>{report.recommendations}</strong>
                    </p>
                    <p>
                      Scores — infrastructure {report.infrastructureScore}, faculty {report.facultyScore},
                      labs {report.labScore}; safety {report.safetyCompliance ? 'compliant' : 'not compliant'}.
                    </p>
                    <p>{report.remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No expert visit linked to this case.</p>
            )}
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              Undertakings
            </h3>
            {appUndertakings.length === 0 ? (
              <p className="text-[11px] text-slate-500">No undertakings attached.</p>
            ) : (
              <ul className="space-y-1.5">
                {appUndertakings.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-500">
                        Due {formatDisplayDate(item.dueDate)}
                        {item.verifiedBy ? ` · verified by ${item.verifiedBy}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {undertakingBucket(item, config, now)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {riskDocuments.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Documents needing attention
              </h3>
              <ul className="space-y-1.5">
                {riskDocuments.slice(0, 6).map(({ document, validity }) => (
                  <li key={document.id} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-700 truncate">{document.title}</span>
                    <span className="text-[10px] font-semibold text-rose-600 shrink-0">
                      {validityLabel(validity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 p-3">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Communication drafts</h3>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_KINDS.map((kind) => (
                <button
                  key={kind}
                  onClick={() => setTemplateKind(kind)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${focusRing} ${
                    templateKind === kind
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {communicationTemplate(kind, app, {
                    officer: user?.name ?? 'Authorised officer',
                    config,
                    now
                  }).title}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-slate-700 mt-3">{template.subject}</p>
            <pre className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 max-h-52 overflow-y-auto font-sans">
              {template.body}
            </pre>
            <button
              onClick={copyTemplate}
              className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer ${focusRing}`}
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              Copy draft
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
};

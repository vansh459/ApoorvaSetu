import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  XCircle,
  Mail,
  Phone,
  GraduationCap,
  AlertTriangle,
  Undo2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { canonicalStage } from '../../workflow/stages';
import { getApplicationStagePath } from '../../workflow/routes';
import { reasonCodesFor } from '../../workflow/codes';
import { Badge, Button, Field, Modal, Notice, Select, Textarea } from '../ui';

export const ApplicationDetailModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    selectedApplication,
    transitionApplication,
    checkTransition
  } = useApp();

  const [pendingAction, setPendingAction] = useState<'RETURN' | 'REJECT' | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');

  const app = selectedApplication;
  const stages = useMemo(() => (app ? getApplicationStagePath(app) : []), [app]);

  if (!app) return null;

  const currentIdx = stages.indexOf(canonicalStage(app.stage));
  const isTerminal = app.status === 'Approved' || app.status === 'Rejected';
  const isReturned = app.status === 'Returned';

  const forwardCheck = checkTransition(app.id, { action: 'FORWARD', expectedVersion: app.version });
  const approveCheck = checkTransition(app.id, { action: 'APPROVE', expectedVersion: app.version });
  const resubmitCheck = checkTransition(app.id, { action: 'RESUBMIT', expectedVersion: app.version });
  const returnProbe = checkTransition(app.id, {
    action: 'RETURN',
    reasonCode: 'OTHER',
    note: 'probe',
    expectedVersion: app.version
  });
  const rejectProbe = checkTransition(app.id, {
    action: 'REJECT',
    reasonCode: 'OTHER',
    note: 'probe',
    expectedVersion: app.version
  });

  const canAttempt = (result: { code?: string }) => result.code !== 'FORBIDDEN';
  const showForward = currentIdx >= 0 && currentIdx < stages.length - 1 && canAttempt(forwardCheck);
  const showApprove = canAttempt(approveCheck);
  const showReturn = canAttempt(returnProbe);
  const showReject = canAttempt(rejectProbe);
  const hasActions = showForward || showApprove || showReturn || showReject;

  const denialHints = [
    showForward && !forwardCheck.ok ? forwardCheck.message : null,
    showApprove && !approveCheck.ok ? approveCheck.message : null
  ].filter((message): message is string => Boolean(message));

  const openDeficiencies = (app.deficiencies ?? []).filter((deficiency) => !deficiency.resolvedAt);

  const resetActionForm = () => {
    setPendingAction(null);
    setReasonCode('');
    setNote('');
  };

  const submitAction = () => {
    if (!pendingAction || !reasonCode || !note.trim()) return;
    transitionApplication(app.id, {
      action: pendingAction,
      reasonCode,
      note: note.trim(),
      expectedVersion: app.version
    });
    resetActionForm();
    setActiveModal(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    resetActionForm();
  };

  return (
    <Modal
      isOpen={activeModal === 'app-detail'}
      onClose={closeModal}
      title={`Application ${app.id}`}
      subtitle={`${app.instituteName}, ${app.region} Region`}
      size="lg"
      maxWidth="max-w-4xl"
      footer={
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-2">
              Current stage: <span className="font-medium text-ink">{app.stage}</span>
            </span>
            <StatusBadge status={app.status} size="sm" />
          </div>

          {isTerminal ? (
            <div className="mt-3 space-y-1.5 rounded-control bg-surface-2 p-3 text-sm">
              <div className="font-medium text-ink">
                Decision recorded: {app.decision?.outcome ?? app.status}
              </div>
              {app.decision && (
                <>
                  <div className="text-xs text-ink-2">
                    Authority:{' '}
                    <span className="font-medium text-ink">
                      {app.decision.competentAuthority ?? app.decision.by}
                    </span>{' '}
                    ({app.decision.code})
                  </div>
                  <p className="text-xs text-ink-2">{app.decision.note}</p>
                </>
              )}
              <p className="text-xs text-ink-3">
                Terminal cases are immutable; the record can only be read or exported.
              </p>
            </div>
          ) : isReturned ? (
            <div className="mt-3 space-y-2">
              <Notice tone="warning">
                Case returned for correction. The statutory clock is paused until the institution
                resubmits.
              </Notice>
              <div className="flex flex-wrap items-center gap-2">
                {resubmitCheck.code !== 'FORBIDDEN' ? (
                  <Button
                    disabled={!resubmitCheck.ok}
                    title={resubmitCheck.ok ? undefined : resubmitCheck.message}
                    onClick={() => {
                      transitionApplication(app.id, {
                        action: 'RESUBMIT',
                        note: 'Corrections resubmitted by the institution.',
                        expectedVersion: app.version
                      });
                      setActiveModal(null);
                    }}
                    icon={<Undo2 className="h-4 w-4" strokeWidth={1.75} />}
                  >
                    Resubmit corrections
                  </Button>
                ) : (
                  <p className="text-xs text-ink-2">
                    Awaiting the institution to resubmit the corrected application.
                  </p>
                )}
              </div>
              {resubmitCheck.code !== 'FORBIDDEN' && !resubmitCheck.ok && (
                <p className="text-xs text-danger">{resubmitCheck.message}</p>
              )}
            </div>
          ) : pendingAction ? (
            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Reason code" htmlFor="detail-reason" required>
                  <Select
                    id="detail-reason"
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                  >
                    <option value="">Select statutory reason…</option>
                    {reasonCodesFor(pendingAction).map((reason) => (
                      <option key={reason.code} value={reason.code}>
                        {reason.code}: {reason.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Officer note" htmlFor="detail-note" required>
                  <Textarea
                    id="detail-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    placeholder={
                      pendingAction === 'RETURN'
                        ? 'State the deficiency and what the institution must correct…'
                        : 'Record the statutory grounds for rejection…'
                    }
                    className="resize-none"
                  />
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={resetActionForm}>
                  Cancel
                </Button>
                <Button
                  variant={pendingAction === 'RETURN' ? 'primary' : 'danger'}
                  disabled={!reasonCode || !note.trim()}
                  onClick={submitAction}
                >
                  {pendingAction === 'RETURN' ? 'Confirm return' : 'Confirm rejection'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {showForward && (
                <Button
                  disabled={!forwardCheck.ok}
                  title={forwardCheck.ok ? undefined : forwardCheck.message}
                  onClick={() => {
                    transitionApplication(app.id, { action: 'FORWARD', expectedVersion: app.version });
                    setActiveModal(null);
                  }}
                >
                  Advance stage
                </Button>
              )}

              {showReturn && (
                <Button
                  variant="secondary"
                  onClick={() => setPendingAction('RETURN')}
                  icon={<RotateCcw className="h-4 w-4" strokeWidth={1.75} />}
                >
                  Return for correction
                </Button>
              )}

              {showApprove && (
                <Button
                  disabled={!approveCheck.ok}
                  title={approveCheck.ok ? undefined : approveCheck.message}
                  onClick={() => {
                    transitionApplication(app.id, {
                      action: 'APPROVE',
                      reasonCode: 'APPROVED_FINAL',
                      note: 'Final approval granted by the AICTE Competent Authority.',
                      expectedVersion: app.version
                    });
                    setActiveModal(null);
                  }}
                  icon={<Check className="h-4 w-4" strokeWidth={1.75} />}
                >
                  Grant final approval
                </Button>
              )}

              {showReject && (
                <Button
                  variant="danger"
                  onClick={() => setPendingAction('REJECT')}
                  icon={<XCircle className="h-4 w-4" strokeWidth={1.75} />}
                  className="ml-auto"
                >
                  Reject
                </Button>
              )}

              {!hasActions && (
                <p className="text-xs text-ink-2">
                  Read-only view. No statutory action is available to your role at this stage.
                </p>
              )}
            </div>
          )}

          {!isTerminal && !isReturned && !pendingAction && denialHints.length > 0 && (
            <div className="mt-3 space-y-1">
              {denialHints.map((hint) => (
                <p key={hint} className="flex items-start gap-1.5 text-xs text-danger">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span>{hint}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-card bg-surface-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{app.id}</Badge>
              <span className="text-xs text-ink-2">{app.type}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-ink">{app.instituteName}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-ink-2">Proposed intake</dt>
                <dd className="font-medium text-ink">{app.intakeProposed} seats</dd>
              </div>
              <div>
                <dt className="text-ink-2">Applied</dt>
                <dd className="font-medium text-ink">{app.appliedDate}</dd>
              </div>
              <div>
                <dt className="text-ink-2">Last updated</dt>
                <dd className="font-medium text-ink">{app.lastUpdated}</dd>
              </div>
              <div>
                <dt className="text-ink-2">Version</dt>
                <dd className="font-medium text-ink">{app.version}</dd>
              </div>
            </dl>
          </div>

          <section>
            <h4 className="text-sm font-semibold text-ink">Approval pipeline</h4>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {stages.map((stg, i) => {
                const isPast = i < currentIdx;
                const isNow = i === currentIdx;
                return (
                  <div
                    key={stg}
                    className={`rounded-control p-2.5 text-xs ${
                      isPast
                        ? 'bg-success-soft text-success'
                        : isNow
                          ? 'bg-accent-soft text-accent'
                          : 'bg-surface-2 text-ink-2'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      {isPast ? (
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : isNow ? (
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-pill border border-line-strong text-xs">
                          {i + 1}
                        </span>
                      )}
                      <span className="font-medium">Stage {i + 1}</span>
                    </div>
                    <div className="truncate font-semibold">{stg}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {openDeficiencies.length > 0 && (
            <section className="rounded-card bg-warning-soft p-3.5">
              <h4 className="text-sm font-semibold text-warning">
                Open deficiencies ({openDeficiencies.length})
              </h4>
              <div className="mt-2 space-y-2">
                {openDeficiencies.map((deficiency, index) => (
                  <div key={`${deficiency.code}-${index}`} className="text-xs text-warning">
                    <span className="font-mono font-semibold">{deficiency.code}</span>{' '}
                    <span>{deficiency.note}</span>
                    <span className="block opacity-80">
                      Raised at {deficiency.stage} on {deficiency.raisedAt} by {deficiency.raisedBy}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-card bg-surface-2 p-3.5 text-sm">
              <div className="flex items-center gap-2 font-medium text-ink">
                <Building2 className="h-4 w-4 text-ink-2" strokeWidth={1.75} />
                Contact and jurisdiction
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-ink-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{app.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span>{app.contactPhone}</span>
                </div>
                <div>
                  {app.state}, {app.region} Region
                </div>
              </div>
            </div>

            <div className="rounded-card bg-surface-2 p-3.5 text-sm">
              <div className="flex items-center gap-2 font-medium text-ink">
                <GraduationCap className="h-4 w-4 text-ink-2" strokeWidth={1.75} />
                Academic programs
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {app.programs.map((prog) => (
                  <span
                    key={prog}
                    className="rounded-pill bg-surface px-2 py-0.5 text-xs text-ink-2"
                  >
                    {prog}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-2">
                Intake capacity: <span className="font-medium text-ink">{app.intakeProposed} students</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h4 className="text-sm font-semibold text-ink">
              Verification dossiers ({app.documents.length})
            </h4>
            <div className="mt-2.5 divide-y divide-line overflow-hidden rounded-card bg-surface-2">
              {app.documents.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface text-xs font-semibold text-ink-2">
                      PDF
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{doc.name}</div>
                      <div className="text-xs text-ink-2">Uploaded {doc.uploadedOn}</div>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} size="sm" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold text-ink">Audit trail and officer notes</h4>
            <div className="mt-2.5 space-y-2">
              {app.timeline.map((event, idx) => (
                <div
                  key={idx}
                  className="rounded-control bg-surface-2 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{event.stage}</span>
                    <span className="text-xs text-ink-2">{event.date}</span>
                  </div>
                  {event.officer && (
                    <div className="mt-0.5 text-xs text-accent">Handler: {event.officer}</div>
                  )}
                  {event.notes && <p className="mt-1 text-xs text-ink-2">{event.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
};

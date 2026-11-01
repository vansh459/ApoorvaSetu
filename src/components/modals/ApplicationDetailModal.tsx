import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Check,
  XCircle,
  Mail,
  Phone,
  GraduationCap,
  AlertTriangle,
  Undo2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { canonicalStage } from '../../workflow/stages';
import { getApplicationStagePath } from '../../workflow/routes';
import { reasonCodesFor } from '../../workflow/codes';

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
      title={`Application Dossier — ${app.id}`}
      subtitle={`${app.instituteName} • ${app.region} Region`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {app.id}
              </span>
              <StatusBadge status={app.status} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {app.instituteName}
            </h3>
            <p className="text-xs text-slate-500">
              {app.type} • Proposed Intake: <span className="font-semibold text-slate-700">{app.intakeProposed} Seats</span>
            </p>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Applied: <span className="font-semibold text-slate-700">{app.appliedDate}</span></div>
            <div>Last Updated: <span className="font-semibold text-slate-700">{app.lastUpdated}</span></div>
          </div>
        </div>

        {/* Action Controls for Workflow */}
        <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <span className="text-xs font-bold text-slate-800">Statutory Case Actions</span>
            <span className="text-[11px] text-blue-700 font-medium text-right">
              Current Stage: <span className="font-bold">{app.stage}</span>
            </span>
          </div>

          {isTerminal ? (
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-600">
              <div className="font-bold text-slate-800">
                Decision recorded: {app.decision?.outcome ?? app.status}
              </div>
              {app.decision && (
                <>
                  <div className="mt-1">
                    Authority: <strong className="text-slate-800">{app.decision.competentAuthority ?? app.decision.by}</strong>
                    {' '}({app.decision.code})
                  </div>
                  <p className="mt-1 text-slate-500">{app.decision.note}</p>
                </>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                Terminal cases are immutable; the record can only be read or exported.
              </p>
            </div>
          ) : isReturned ? (
            <div className="space-y-2">
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Case returned for correction. The statutory clock is paused until the institution resubmits.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {resubmitCheck.code !== 'FORBIDDEN' ? (
                  <button
                    onClick={() => {
                      transitionApplication(app.id, {
                        action: 'RESUBMIT',
                        note: 'Corrections resubmitted by the institution.',
                        expectedVersion: app.version
                      });
                      setActiveModal(null);
                    }}
                    disabled={!resubmitCheck.ok}
                    title={resubmitCheck.ok ? undefined : resubmitCheck.message}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Resubmit Corrections</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-600">
                    Awaiting the institution to resubmit the corrected application.
                  </p>
                )}
              </div>
              {resubmitCheck.code !== 'FORBIDDEN' && !resubmitCheck.ok && (
                <p className="text-[11px] text-rose-600">{resubmitCheck.message}</p>
              )}
            </div>
          ) : pendingAction ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold text-slate-600 space-y-1">
                  <span>Reason code</span>
                  <select
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">Select statutory reason…</option>
                    {reasonCodesFor(pendingAction).map((reason) => (
                      <option key={reason.code} value={reason.code}>
                        {reason.code} — {reason.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-semibold text-slate-600 space-y-1">
                  <span>Officer note {note.trim() ? '' : '(required)'}</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    placeholder={
                      pendingAction === 'RETURN'
                        ? 'State the deficiency and what the institution must correct…'
                        : 'Record the statutory grounds for rejection…'
                    }
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg resize-none"
                  />
                </label>
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <button
                  onClick={resetActionForm}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={!reasonCode || !note.trim()}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed ${
                    pendingAction === 'RETURN'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {pendingAction === 'RETURN' ? 'Confirm Return for Correction' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {showForward && (
                <button
                  onClick={() => {
                    transitionApplication(app.id, { action: 'FORWARD', expectedVersion: app.version });
                    setActiveModal(null);
                  }}
                  disabled={!forwardCheck.ok}
                  title={forwardCheck.ok ? undefined : forwardCheck.message}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <span>Advance to Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {showReturn && (
                <button
                  onClick={() => setPendingAction('RETURN')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return for Correction</span>
                </button>
              )}

              {showApprove && (
                <button
                  onClick={() => {
                    transitionApplication(app.id, {
                      action: 'APPROVE',
                      reasonCode: 'APPROVED_FINAL',
                      note: 'Final approval granted by the AICTE Competent Authority.',
                      expectedVersion: app.version
                    });
                    setActiveModal(null);
                  }}
                  disabled={!approveCheck.ok}
                  title={approveCheck.ok ? undefined : approveCheck.message}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Grant Final Approval</span>
                </button>
              )}

              {showReject && (
                <button
                  onClick={() => setPendingAction('REJECT')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors ml-auto"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              )}

              {!hasActions && (
                <p className="text-[11px] text-slate-500">
                  Read-only view — no statutory action is available to your role at this stage.
                </p>
              )}
            </div>
          )}

          {!isTerminal && !isReturned && !pendingAction && denialHints.length > 0 && (
            <div className="mt-3 space-y-1">
              {denialHints.map((hint) => (
                <p key={hint} className="text-[11px] text-rose-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{hint}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {openDeficiencies.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
              Open Deficiencies ({openDeficiencies.length})
            </h4>
            <div className="space-y-2">
              {openDeficiencies.map((deficiency, index) => (
                <div key={`${deficiency.code}-${index}`} className="text-[11px] text-amber-900">
                  <span className="font-bold font-mono">{deficiency.code}</span>
                  {' · '}
                  <span>{deficiency.note}</span>
                  <span className="text-amber-700"> — raised at {deficiency.stage} on {deficiency.raisedAt} by {deficiency.raisedBy}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Stage Visual Stepper */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
            Approval Stages Pipeline
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {stages.map((stg, i) => {
              const isPast = i < currentIdx;
              const isNow = i === currentIdx;

              return (
                <div
                  key={stg}
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    isPast
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : isNow
                      ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-100 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isNow ? (
                      <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-[10px] flex items-center justify-center">
                        {i + 1}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Stage {i + 1}
                    </span>
                  </div>
                  <div className="truncate font-semibold">{stg}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institution Contact & Programs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="font-bold text-slate-800 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Contact & Jurisdiction</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{app.contactEmail}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{app.contactPhone}</span>
            </div>
            <div className="text-slate-500">
              State: <span className="font-medium text-slate-700">{app.state}</span> ({app.region} Region)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="font-bold text-slate-800 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Academic Programs</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {app.programs.map((prog) => (
                <span
                  key={prog}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11px]"
                >
                  {prog}
                </span>
              ))}
            </div>
            <div className="text-slate-500 text-[11px]">
              Intake Capacity: <span className="font-bold text-slate-800">{app.intakeProposed} students</span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
            Uploaded Verification Dossiers ({app.documents.length})
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {app.documents.map((doc) => (
              <div
                key={doc.name}
                className="p-3 flex items-center justify-between text-xs hover:bg-slate-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                    PDF
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{doc.name}</div>
                    <div className="text-[11px] text-slate-400">
                      Uploaded on {doc.uploadedOn}
                    </div>
                  </div>
                </div>
                <StatusBadge status={doc.status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline audit trail */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
            Audit Trail & Officer Notes
          </h4>
          <div className="space-y-2">
            {app.timeline.map((event, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 text-xs p-2.5 rounded-xl bg-slate-50/80 border border-slate-100"
              >
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{event.stage}</span>
                    <span className="text-[11px] text-slate-400">{event.date}</span>
                  </div>
                  {event.officer && (
                    <div className="text-[11px] text-blue-600 font-medium">
                      Handler: {event.officer}
                    </div>
                  )}
                  {event.notes && (
                    <div className="text-slate-600 mt-0.5 text-[11px]">
                      {event.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

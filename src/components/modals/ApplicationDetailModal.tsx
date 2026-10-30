import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Check,
  XCircle,
  FileText,
  Mail,
  Phone,
  GraduationCap
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { ApplicationStage } from '../../types';

export const ApplicationDetailModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    selectedApplication,
    advanceApplication,
    returnApplication,
    approveApplication,
    rejectApplication
  } = useApp();

  const [returnReason, setReturnReason] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!selectedApplication) return null;

  const app = selectedApplication;

  const stages: ApplicationStage[] = [
    'Submitted',
    'Scrutiny / Re-scrutiny',
    'Expert Visit Committee (EVC)',
    'SAC / SHC',
    'Approval (Subject to Undertaking)',
    'Final Approval'
  ];

  const currentIdx = stages.indexOf(app.stage);

  return (
    <Modal
      isOpen={activeModal === 'app-detail'}
      onClose={() => {
        setActiveModal(null);
        setIsReturning(false);
        setIsRejecting(false);
      }}
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">
              Regional Officer Workflow Controls
            </span>
            <span className="text-[11px] text-blue-700 font-medium">
              Current Stage: <span className="font-bold">{app.stage}</span>
            </span>
          </div>

          {isReturning ? (
            <div className="space-y-2 animate-in fade-in">
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Specify deficiency or required documents from institution..."
                className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-hidden"
              />
              <div className="flex items-center space-x-2 justify-end">
                <button
                  onClick={() => setIsReturning(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (returnReason) {
                      returnApplication(app.id, returnReason);
                      setIsReturning(false);
                      setActiveModal(null);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Confirm Return for Correction
                </button>
              </div>
            </div>
          ) : isRejecting ? (
            <div className="space-y-2 animate-in fade-in">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify formal grounds for rejection..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-xl focus:outline-hidden"
              />
              <div className="flex items-center space-x-2 justify-end">
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (rejectReason) {
                      rejectApplication(app.id, rejectReason);
                      setIsRejecting(false);
                      setActiveModal(null);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {currentIdx < stages.length - 1 && (
                <button
                  onClick={() => {
                    advanceApplication(app.id);
                    setActiveModal(null);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <span>Advance to Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setIsReturning(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return for Correction</span>
              </button>

              <button
                onClick={() => {
                  approveApplication(app.id);
                  setActiveModal(null);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Grant Final Approval</span>
              </button>

              <button
                onClick={() => setIsRejecting(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors ml-auto"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          )}
        </div>

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

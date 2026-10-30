import React, { useState } from 'react';
import { Search, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';

export const TrackApplicationModal: React.FC = () => {
  const { activeModal, setActiveModal, applications, setSelectedApplication } = useApp();
  const [appIdInput, setAppIdInput] = useState('AICTE/2025/12876');

  const matchedApp = applications.find(
    (a) => a.id.toLowerCase().trim() === appIdInput.toLowerCase().trim()
  ) || applications[0];

  const stages = [
    'Submitted',
    'Scrutiny / Re-scrutiny',
    'Expert Visit Committee (EVC)',
    'SAC / SHC',
    'Approval (Subject to Undertaking)',
    'Final Approval'
  ];

  const currentStageIndex = matchedApp ? stages.indexOf(matchedApp.stage) : 0;

  return (
    <Modal
      isOpen={activeModal === 'track-app'}
      onClose={() => setActiveModal(null)}
      title="Track Application Status"
      subtitle="Real-time multi-stage approval lifecycle tracker"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Search input */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={appIdInput}
              onChange={(e) => setAppIdInput(e.target.value)}
              placeholder="Enter Application ID (e.g. AICTE/2025/12876)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            Track Status
          </button>
        </div>

        {/* Quick select buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span>Quick check:</span>
          {applications.slice(0, 4).map((a) => (
            <button
              key={a.id}
              onClick={() => setAppIdInput(a.id)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition-colors"
            >
              {a.id}
            </button>
          ))}
        </div>

        {matchedApp ? (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            {/* Top meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600">{matchedApp.id}</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {matchedApp.instituteName}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {matchedApp.type} • {matchedApp.region} Region
                </p>
              </div>
              <StatusBadge status={matchedApp.status} />
            </div>

            {/* Stepper Pipeline */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Approval Pipeline Progress
              </div>
              <div className="space-y-3">
                {stages.map((stg, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stg} className="flex items-center space-x-3 text-xs">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isCurrent ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span
                          className={`font-semibold ${
                            isCurrent
                              ? 'text-blue-700 font-bold'
                              : isDone
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {stg}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {isDone ? 'Completed' : isCurrent ? 'Active Stage' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remarks note */}
            {matchedApp.remarks && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
                <span className="font-bold">Latest Officer Note: </span>
                {matchedApp.remarks}
              </div>
            )}

            {/* Footer action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedApplication(matchedApp);
                  setActiveModal('app-detail');
                }}
                className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>Open Full Application & Action Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No application found with ID "{appIdInput}".
          </div>
        )}
      </div>
    </Modal>
  );
};

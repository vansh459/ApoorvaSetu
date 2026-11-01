import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button, EmptyState, Field, Input, Notice } from '../ui';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { filterApplicationsForUser } from '../../services/rbacService';
import { canonicalStage } from '../../workflow/stages';
import { getApplicationStagePath } from '../../workflow/routes';
import { formatDisplayDate } from '../../utils/dates';

export const TrackApplicationModal: React.FC = () => {
  const { activeModal, setActiveModal, applications, setSelectedApplication } = useApp();
  const { user } = useAuth();
  const [appIdInput, setAppIdInput] = useState('AICTE/2026/12876');

  const scopedApps = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );

  const matchedApp = scopedApps.find(
    (a) => a.id.toLowerCase().trim() === appIdInput.toLowerCase().trim()
  );

  const stages = matchedApp ? getApplicationStagePath(matchedApp) : [];
  const currentStageIndex = matchedApp
    ? stages.indexOf(canonicalStage(matchedApp.stage))
    : -1;

  return (
    <Modal
      isOpen={activeModal === 'track-app'}
      onClose={() => setActiveModal(null)}
      title="Track application status"
      subtitle="Live view of the approval lifecycle for one case"
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Application ID" htmlFor="track-application-id" className="flex-1">
            <Input
              id="track-application-id"
              type="text"
              value={appIdInput}
              onChange={(e) => setAppIdInput(e.target.value)}
              placeholder="AICTE/2026/12876"
            />
          </Field>
          <Button>Track status</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-2">Quick check</span>
          {scopedApps.slice(0, 4).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAppIdInput(a.id)}
              className="rounded-pill bg-surface-2 px-2.5 py-1 font-mono text-xs text-ink-2 transition-colors duration-150 hover:text-ink"
            >
              {a.id}
            </button>
          ))}
        </div>

        {matchedApp ? (
          <div className="space-y-5 rounded-card bg-surface-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div className="min-w-0">
                <span className="font-mono text-xs text-ink-2">{matchedApp.id}</span>
                <h3 className="mt-1 text-base font-semibold text-ink">{matchedApp.instituteName}</h3>
                <p className="mt-0.5 text-xs text-ink-2">
                  {matchedApp.type}, {matchedApp.region} Region
                </p>
                {matchedApp.stageDueAt && (
                  <p className="mt-1 text-xs text-ink-2">
                    Statutory deadline{' '}
                    <span className="font-medium text-ink">
                      {formatDisplayDate(matchedApp.stageDueAt)}
                    </span>
                    {matchedApp.slaTier ? `, ${matchedApp.slaTier}` : ''}
                  </p>
                )}
              </div>
              <StatusBadge status={matchedApp.status} />
            </div>

            <div>
              <div className="mb-3 text-label font-medium text-ink-2">Approval pipeline</div>
              <div className="space-y-3">
                {stages.map((stg, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stg} className="flex items-center gap-3 text-xs">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill font-semibold ${
                          isDone
                            ? 'bg-success text-white'
                            : isCurrent
                              ? 'bg-accent text-white'
                              : 'bg-line text-ink-2'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        ) : isCurrent ? (
                          <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span
                          className={`truncate ${
                            isCurrent
                              ? 'font-semibold text-ink'
                              : isDone
                                ? 'font-medium text-ink'
                                : 'text-ink-2'
                          }`}
                        >
                          {stg}
                        </span>
                        <span className="shrink-0 text-ink-2">
                          {isDone ? 'Completed' : isCurrent ? 'Active stage' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {matchedApp.remarks && (
              <Notice tone="info" title="Latest officer note">
                {matchedApp.remarks}
              </Notice>
            )}

            <div className="flex justify-end">
              <Button
                variant="link"
                onClick={() => {
                  setSelectedApplication(matchedApp);
                  setActiveModal('app-detail');
                }}
              >
                Open application dossier
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="No application found"
            description={`No case matches ${appIdInput}. Check the ID or pick one from the quick check list.`}
          />
        )}
      </div>
    </Modal>
  );
};

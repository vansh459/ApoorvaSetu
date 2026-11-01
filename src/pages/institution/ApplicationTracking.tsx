import React, { useMemo, useState } from 'react';
import { CalendarClock, Check, Download, FileSearch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { getApplicationStagePath } from '../../workflow/routes';
import { canonicalStage, getStageMeta } from '../../workflow/stages';
import { formatDisplayDate } from '../../utils/dates';
import type { ApplicationStage } from '../../types';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  IconButton,
  PageHeader,
  Select
} from '../../components/ui';

export const ApplicationTracking: React.FC = () => {
  const { user } = useAuth();
  const { applications, showToast } = useApp();

  const myApps = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeApp = myApps.find((app) => app.id === selectedId) ?? myApps[0];

  const steps = useMemo(() => {
    if (!activeApp) return [];
    const path = getApplicationStagePath(activeApp);
    const byStage = new Map(activeApp.timeline.map((event) => [canonicalStage(event.stage as ApplicationStage), event]));
    return path.map((stage, index) => {
      const meta = getStageMeta(stage);
      const event = byStage.get(stage);
      return {
        key: `${stage}-${index}`,
        label: meta.label,
        officer: meta.responsible,
        date: event?.date ?? 'Pending',
        status: event?.status ?? 'pending',
        note: event?.notes,
        dueAt: event?.dueAt
      };
    });
  }, [activeApp]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application progress"
        description="Live milestone timeline, officer actions and the statutory deadline attached to each stage."
        meta={
          <>
            <Badge tone="info">Institution admin</Badge>
            <span className="text-xs text-ink-2">{user?.instituteName || 'Institution'}</span>
          </>
        }
      />

      {!activeApp ? (
        <Card>
          <EmptyState
            icon={FileSearch}
            title="No applications filed yet"
            description="Submit an application to start tracking its routing, deadlines and officer actions."
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold text-ink">{activeApp.id}</span>
                  <Badge tone="neutral">{activeApp.type}</Badge>
                  <Badge tone="info">{getStageMeta(activeApp.stage).shortLabel}</Badge>
                </div>
                <p className="mt-1.5 text-label text-ink-2">
                  Submitted {activeApp.appliedDate}, intake proposed {activeApp.intakeProposed} seats
                </p>
              </div>

              <div className="flex items-center gap-2">
                {myApps.length > 1 && (
                  <div className="w-full sm:w-56">
                    <Select
                      value={activeApp.id}
                      onChange={(event) => setSelectedId(event.target.value)}
                      aria-label="Select application"
                      className="text-label"
                    >
                      {myApps.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.id}, {app.type}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <IconButton
                  label="Download application summary"
                  variant="secondary"
                  onClick={() => showToast('Application summary downloaded as PDF', 'success')}
                >
                  <Download className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          </Card>

          <Card padded="none">
            <CardHeader
              title="Approval milestones"
              description="Each stage in routing order, with the responsible authority and its deadline."
            />
            <ol className="space-y-6 p-5 sm:p-6">
              {steps.map((step, index) => {
                const isDone = step.status === 'completed';
                const isCurrent = step.status === 'current';

                return (
                  <li key={step.key} className="grid grid-cols-[24px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          isDone
                            ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white'
                            : isCurrent
                              ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white'
                              : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-xs font-medium text-ink-2'
                        }
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {index < steps.length - 1 && (
                        <span className="mt-2 w-px flex-1 bg-line" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={
                              isCurrent
                                ? 'text-sm font-semibold text-ink'
                                : isDone
                                  ? 'text-sm font-medium text-ink'
                                  : 'text-sm font-medium text-ink-2'
                            }
                          >
                            {step.label}
                          </p>
                          {isCurrent && <Badge tone="info">In progress</Badge>}
                        </div>
                        <span className="font-mono text-xs text-ink-2">{step.date}</span>
                      </div>

                      <p className="mt-1 text-label text-ink-2">{step.officer}</p>

                      {step.dueAt && isCurrent && (
                        <p className="mt-1 flex items-center gap-1.5 text-label text-ink-2">
                          <CalendarClock
                            className="h-3.5 w-3.5 text-ink-3"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          Statutory deadline {formatDisplayDate(step.dueAt)}
                        </p>
                      )}

                      {step.note && (
                        <p className="mt-2 rounded-control bg-surface-2 p-3 text-label leading-relaxed text-ink-2">
                          {step.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
};

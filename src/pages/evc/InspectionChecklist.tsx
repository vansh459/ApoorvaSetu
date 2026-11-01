import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ClipboardCheck, Save, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { EVC_CHECKLIST_SECTIONS, EVC_CHECKLIST_ITEMS } from '../../workflow/evc';
import { formatDisplayDate } from '../../utils/dates';
import { EVCVisitChecklistItem } from '../../types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  ProgressBar,
  Select
} from '../../components/ui';

export const InspectionChecklist: React.FC = () => {
  const { user } = useAuth();
  const { evcVisits, saveVisitChecklist } = useApp();
  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const [visitId, setVisitId] = useState(assignedVisits[0]?.id ?? '');
  // The snapshot hydrates after mount in Postgres mode, so fall back to the first assigned visit.
  const visit = assignedVisits.find((item) => item.id === visitId) ?? assignedVisits[0];
  const [marks, setMarks] = useState<EVCVisitChecklistItem[]>(visit?.checklist ?? []);

  useEffect(() => {
    setMarks(visit?.checklist ?? []);
  }, [visitId, visit?.checklist]);

  const markById = useMemo(() => new Map(marks.map((mark) => [mark.id, mark.passed])), [marks]);

  const progress = {
    total: EVC_CHECKLIST_ITEMS.length,
    assessed: marks.length,
    passed: marks.filter((mark) => mark.passed).length,
    failed: marks.filter((mark) => !mark.passed).length,
    complete: marks.length === EVC_CHECKLIST_ITEMS.length
  };
  const dirty = JSON.stringify(visit?.checklist ?? []) !== JSON.stringify(marks);

  const setItem = (id: string, passed: boolean) => {
    setMarks((prev) => {
      const next = prev.filter((mark) => mark.id !== id);
      next.push({ id, passed });
      return EVC_CHECKLIST_ITEMS.filter((item) => next.some((mark) => mark.id === item.id)).map(
        (item) => next.find((mark) => mark.id === item.id)!
      );
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection checklist"
        description="Standard AICTE Approval Process Handbook criteria recorded against a scheduled campus visit."
        meta={
          <>
            <Badge tone="info">EVC audit toolkit</Badge>
            <span className="text-xs text-ink-2">Standard operating procedure</span>
          </>
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => visit && saveVisitChecklist(visit.id, marks)}
            disabled={!visit || !dirty || visit.reportSubmitted}
            icon={<Save className="h-4 w-4" />}
          >
            {dirty ? 'Save checklist' : 'Checklist saved'}
          </Button>
        }
      />

      {assignedVisits.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No inspection visit assigned to you"
            description="The checklist opens once a committee visit is scheduled for your region."
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Inspection visit" htmlFor="checklist-visit">
                <Select
                  id="checklist-visit"
                  value={visit?.id ?? ''}
                  onChange={(e) => setVisitId(e.target.value)}
                >
                  {assignedVisits.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}, {item.instituteName}
                      {item.date ? ` (${formatDisplayDate(item.date)})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="sm:w-56">
                <div className="mb-2 flex items-center justify-between gap-3 text-label">
                  <span className="text-ink-2">
                    {progress.assessed}/{progress.total} assessed
                  </span>
                  <span className="font-semibold text-ink">{progress.failed} deficient</span>
                </div>
                <ProgressBar
                  value={progress.assessed}
                  max={progress.total}
                  tone={progress.complete ? 'success' : 'info'}
                  label="Checklist progress"
                />
              </div>
            </div>
          </Card>

          {visit?.reportSubmitted && (
            <Notice tone="success" icon={CheckCircle2}>
              The inspection report for this visit is already on record, so the checklist is read-only.
            </Notice>
          )}

          <div className="space-y-6">
            {EVC_CHECKLIST_SECTIONS.map((cat) => (
              <Card key={cat.category} padded="none">
                <CardHeader title={cat.category} />
                <div className="space-y-2 p-5 sm:p-6">
                  {cat.items.map((item) => {
                    const passed = markById.get(item.id);
                    const assessed = passed !== undefined;
                    const locked = Boolean(visit?.reportSubmitted);
                    return (
                      <div
                        key={item.id}
                        className={
                          !assessed
                            ? 'flex flex-col gap-3 rounded-control bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:justify-between'
                            : passed
                              ? 'flex flex-col gap-3 rounded-control bg-success-soft/60 p-3.5 sm:flex-row sm:items-center sm:justify-between'
                              : 'flex flex-col gap-3 rounded-control bg-danger-soft/60 p-3.5 sm:flex-row sm:items-center sm:justify-between'
                        }
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="shrink-0 font-mono text-xs text-ink-2">{item.id}</span>
                          <span className="text-sm text-ink">{item.description}</span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={locked}
                            aria-pressed={passed === true}
                            onClick={() => setItem(item.id, true)}
                            className={
                              passed === true
                                ? 'inline-flex h-8 items-center gap-1.5 rounded-control bg-success px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60'
                                : 'inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60'
                            }
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                            Compliant
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            aria-pressed={passed === false}
                            onClick={() => setItem(item.id, false)}
                            className={
                              passed === false
                                ? 'inline-flex h-8 items-center gap-1.5 rounded-control bg-danger px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60'
                                : 'inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60'
                            }
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Deficient
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

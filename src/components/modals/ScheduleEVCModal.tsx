import React, { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button, Field, Input, Notice, Select } from '../ui';
import { useApp } from '../../context/AppContext';
import { evcScheduleCandidates } from '../../workflow/evc';
import { routeForApplication } from '../../workflow/routes';
import { resolveWorkflowConfig } from '../../workflow/config';
import { getStageMeta } from '../../workflow/stages';
import { authService } from '../../services/authService';
import { addCalendarDays, computeDueDate, formatDisplayDate, getNow, toIsoDate } from '../../utils/dates';

const defaultDate = () => toIsoDate(addCalendarDays(getNow(), 7));

export const ScheduleEVCModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    applications,
    evcVisits,
    scheduleEVC,
    selectedApplication
  } = useApp();

  const candidates = useMemo(
    () => evcScheduleCandidates(applications, evcVisits),
    [applications, evcVisits]
  );

  const [applicationId, setApplicationId] = useState(candidates[0]?.id || '');

  useEffect(() => {
    if (activeModal !== 'schedule-evc') return;
    const preferred = candidates.some((app) => app.id === selectedApplication?.id)
      ? selectedApplication!.id
      : candidates[0]?.id || '';
    if (preferred) setApplicationId(preferred);
  }, [activeModal, selectedApplication, candidates]);
  const [date, setDate] = useState(defaultDate);
  const [committeeName, setCommitteeName] = useState('Committee North-Special');
  const [member1, setMember1] = useState('Prof. A. K. Sharma (IIT Roorkee)');
  const [member2, setMember2] = useState('Dr. P. Sen (NIT Jalandhar)');
  const [mode, setMode] = useState<'Physical' | 'Hybrid' | 'Virtual'>('Physical');

  const selectedApp = candidates.find((app) => app.id === applicationId);
  const reportDueAt = date ? computeDueDate(date, resolveWorkflowConfig(authService.getSystemConfig()).evcReportSlaDays, false) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !date) return;

    const dateObj = new Date(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' });

    const scheduled = scheduleEVC({
      applicationId: selectedApp.id,
      instituteId: selectedApp.instituteId,
      instituteName: selectedApp.instituteName,
      region: selectedApp.region,
      stateRegion: `${selectedApp.state} (${selectedApp.region} Region)`,
      date,
      displayDate: { day, month },
      status: 'Scheduled',
      assignedCommittee: committeeName,
      committeeMembers: [member1, member2],
      mode,
      reportSubmitted: false
    });

    if (scheduled) setActiveModal(null);
  };

  return (
    <Modal
      isOpen={activeModal === 'schedule-evc'}
      onClose={() => setActiveModal(null)}
      title="Schedule an expert visit committee"
      subtitle="Constitute the committee and bind the visit to an application under review"
      footer={
        <>
          <Button variant="secondary" onClick={() => setActiveModal(null)}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-evc-form" disabled={!selectedApp}>
            Confirm and schedule visit
          </Button>
        </>
      }
    >
      <form id="schedule-evc-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Field
            label="Application requiring inspection"
            htmlFor="evc-application"
            hint={
              selectedApp
                ? `${routeForApplication(selectedApp).label}, stage ${
                    getStageMeta(selectedApp.stage).label
                  }, ${selectedApp.region} Region`
                : undefined
            }
          >
            <Select
              id="evc-application"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              disabled={candidates.length === 0}
            >
              {candidates.length === 0 && (
                <option value="">No application is awaiting an EVC visit</option>
              )}
              {candidates.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.id}: {app.instituteName} ({getStageMeta(app.stage).label})
                </option>
              ))}
            </Select>
          </Field>

          {!selectedApp && (
            <Notice tone="warning" className="mt-3">
              Every application with a scheduled visit needs a scrutiny-forwarded case. Forward a
              case to the Expert Visit Committee stage, then schedule its inspection here.
            </Notice>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field
              label="Inspection date"
              htmlFor="evc-date"
              required
              hint={reportDueAt ? `Report due ${formatDisplayDate(reportDueAt)}` : undefined}
            >
              <Input
                id="evc-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Visit mode" htmlFor="evc-mode">
            <Select
              id="evc-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'Physical' | 'Hybrid' | 'Virtual')}
            >
              <option value="Physical">Physical (on-site visit)</option>
              <option value="Hybrid">Hybrid (on-site + digital feed)</option>
              <option value="Virtual">Virtual inspection</option>
            </Select>
          </Field>
        </div>

        <div className="space-y-4 border-t border-line pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
            Committee composition
          </div>

          <Field label="Committee code or name" htmlFor="evc-committee" required>
            <Input
              id="evc-committee"
              type="text"
              required
              value={committeeName}
              onChange={(e) => setCommitteeName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Chairperson, subject expert 1" htmlFor="evc-member-1" required>
              <Input
                id="evc-member-1"
                type="text"
                required
                value={member1}
                onChange={(e) => setMember1(e.target.value)}
              />
            </Field>

            <Field label="Subject expert 2" htmlFor="evc-member-2" required>
              <Input
                id="evc-member-2"
                type="text"
                required
                value={member2}
                onChange={(e) => setMember2(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
};

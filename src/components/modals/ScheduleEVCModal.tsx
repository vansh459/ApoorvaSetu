import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Users, MapPin, Building, AlertTriangle, Clock3 } from 'lucide-react';
import { Modal } from '../common/Modal';
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
      title="Schedule Expert Visit Committee (EVC)"
      subtitle="Constitute the committee and bind the visit to an application under review"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Application Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Application Requiring Inspection
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              disabled={candidates.length === 0}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:text-slate-400"
            >
              {candidates.length === 0 && <option value="">No application is awaiting an EVC visit</option>}
              {candidates.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.id} — {app.instituteName} ({getStageMeta(app.stage).label})
                </option>
              ))}
            </select>
          </div>

          {selectedApp ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{routeForApplication(selectedApp).label}</span>
              <span>Stage: {getStageMeta(selectedApp.stage).label}</span>
              <span>Region: {selectedApp.region}</span>
            </div>
          ) : (
            <div className="mt-2 flex items-start space-x-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Every application with a scheduled visit needs a scrutiny-forwarded case. Forward a case to the
                Expert Visit Committee stage, then schedule its inspection here.
              </span>
            </div>
          )}
        </div>

        {/* Date and Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspection Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            {reportDueAt && (
              <span className="mt-1 flex items-center space-x-1 text-[10px] text-slate-400">
                <Clock3 className="w-3 h-3" />
                <span>Report due {formatDisplayDate(reportDueAt)}</span>
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Visit Mode
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'Physical' | 'Hybrid' | 'Virtual')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                <option value="Physical">Physical (On-site Visit)</option>
                <option value="Hybrid">Hybrid (On-site + Digital Feed)</option>
                <option value="Virtual">Virtual Inspection</option>
              </select>
            </div>
          </div>
        </div>

        {/* Committee Panel */}
        <div className="border border-slate-200/80 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Committee Composition</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Committee Code / Name
            </label>
            <input
              type="text"
              required
              value={committeeName}
              onChange={(e) => setCommitteeName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chairman / Subject Expert 1
              </label>
              <input
                type="text"
                required
                value={member1}
                onChange={(e) => setMember1(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Subject Expert 2
              </label>
              <input
                type="text"
                required
                value={member2}
                onChange={(e) => setMember2(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedApp}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            Confirm & Schedule Visit
          </button>
        </div>
      </form>
    </Modal>
  );
};

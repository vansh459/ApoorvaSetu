import React, { useState } from 'react';
import { Calendar, Users, MapPin, Building } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Region } from '../../types';

export const ScheduleEVCModal: React.FC = () => {
  const { activeModal, setActiveModal, institutes, scheduleEVC } = useApp();

  const [selectedInstId, setSelectedInstId] = useState(institutes[0]?.id || '');
  const [date, setDate] = useState('2025-11-15');
  const [committeeName, setCommitteeName] = useState('Committee North-Special');
  const [member1, setMember1] = useState('Prof. A. K. Sharma (IIT Roorkee)');
  const [member2, setMember2] = useState('Dr. P. Sen (NIT Jalandhar)');
  const [mode, setMode] = useState<'Physical' | 'Hybrid' | 'Virtual'>('Physical');

  const selectedInst = institutes.find((i) => i.id === selectedInstId) || institutes[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !date) return;

    const dateObj = new Date(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' });

    scheduleEVC({
      instituteId: selectedInst.id,
      instituteName: selectedInst.name,
      region: selectedInst.region as Region,
      stateRegion: `${selectedInst.state} (${selectedInst.region} Region)`,
      date,
      displayDate: { day, month },
      status: 'Scheduled',
      assignedCommittee: `${committeeName} (${member1.split(' ')[1]}, ${member2.split(' ')[1]})`,
      committeeMembers: [member1, member2],
      mode,
      reportSubmitted: false
    });

    setActiveModal(null);
  };

  return (
    <Modal
      isOpen={activeModal === 'schedule-evc'}
      onClose={() => setActiveModal(null)}
      title="Schedule Expert Visit Committee (EVC)"
      subtitle="Constitute committee panel and schedule on-site/hybrid verification"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Institute Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Target Institution
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} — {inst.city}, {inst.state} ({inst.region})
                </option>
              ))}
            </select>
          </div>
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Visit Mode
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
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
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            Confirm & Schedule Visit
          </button>
        </div>
      </form>
    </Modal>
  );
};

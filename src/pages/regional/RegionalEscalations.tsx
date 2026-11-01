import React, { useMemo, useState } from 'react';
import {
  Plus,
  X,
  CheckCircle2,
  Clock,
  Send,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { EscalationItem } from '../../types';

type StatusFilter = 'Open' | 'Under Review' | 'Resolved' | 'All';

export const RegionalEscalations: React.FC = () => {
  const { user } = useAuth();
  const {
    applications,
    escalations,
    acknowledgeEscalation,
    resolveEscalation,
    createEscalation
  } = useApp();
  const region = user?.region || 'Northern';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppId, setNewAppId] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newUrgency, setNewUrgency] = useState<'Medium' | 'High' | 'Critical'>('High');
  const [newReason, setNewReason] = useState('');

  const scoped = useMemo(() => {
    if (user?.role === 'REGIONAL_OFFICER' && user.region) {
      return escalations.filter((item) => item.region === user.region);
    }
    return escalations;
  }, [escalations, user]);

  const filtered = statusFilter === 'All' ? scoped : scoped.filter((item) => item.status === statusFilter);

  const counts = {
    open: scoped.filter((item) => item.status === 'Open').length,
    review: scoped.filter((item) => item.status === 'Under Review').length,
    resolved: scoped.filter((item) => item.status === 'Resolved').length
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppId || !newReason.trim()) return;

    const linked = applications.find((app) => app.id === newAppId);
    createEscalation({
      applicationId: newAppId,
      instituteName: newInstName || linked?.instituteName || 'Technical Institution',
      region: (linked?.region ?? region) as EscalationItem['region'],
      urgency: newUrgency,
      reason: newReason.trim()
    });
    setIsModalOpen(false);
    setNewAppId('');
    setNewInstName('');
    setNewReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {region} Regional Office
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Regulatory Escalations</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Central Escalations & Exception Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Flag critical institutional deficiencies or special inspection requests directly to Central AICTE Admin.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Escalation</span>
        </button>
      </div>

      {/* Status filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center gap-1.5">
        {([
          ['Open', `Open (${counts.open})`],
          ['Under Review', `Under Review (${counts.review})`],
          ['Resolved', `Resolved (${counts.resolved})`],
          ['All', `All (${scoped.length})`]
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === value
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Escalation Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No escalations in this view</p>
            <p className="text-xs text-slate-500 mt-1">
              Overdue statutory deadlines are escalated automatically by the SLA monitor.
            </p>
          </div>
        )}

        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2.5 flex-wrap">
                <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {item.applicationId}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {item.instituteName}
                </span>
                {item.level && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    Level {item.level}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${item.urgency === 'Critical'
                      ? 'bg-rose-100 text-rose-800'
                      : item.urgency === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  {item.urgency} Urgency
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'Under Review'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  {item.status}
                </span>
                {typeof item.slaBreachDays === 'number' && item.slaBreachDays > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.slaBreachDays} day(s) overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.reason}
              </p>
              <div className="text-[11px] text-slate-400">
                Raised by {item.raisedBy} on {item.raisedDate}
                {item.acknowledgedBy ? ` · acknowledged by ${item.acknowledgedBy}` : ''}
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-2">
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {item.id}
              </span>
              {item.status === 'Open' && (
                <button
                  onClick={() => acknowledgeEscalation(item.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>
              )}
              {item.status !== 'Resolved' && (
                <button
                  onClick={() => resolveEscalation(item.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Raise Exception / Central Escalation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Escalate complex scrutiny issues, land title disputes, or emergency scheduling to AICTE HQ.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Application ID
                </label>
                <input
                  type="text"
                  value={newAppId}
                  onChange={(e) => setNewAppId(e.target.value)}
                  placeholder="e.g. APP2026-0012"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="e.g. ABC Institute of Technology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Urgency Level
                </label>
                <select
                  value={newUrgency}
                  onChange={(e) => setNewUrgency(e.target.value as 'Medium' | 'High' | 'Critical')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-hidden bg-white"
                >
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specific Reason & Recommendation
                </label>
                <textarea
                  rows={3}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Detail the regulatory dilemma, deficiency, or special exemption required..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

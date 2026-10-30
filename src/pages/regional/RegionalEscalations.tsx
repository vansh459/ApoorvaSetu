import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Send,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { EscalationItem } from '../../types';

export const RegionalEscalations: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useApp();
  const region = user?.region || 'Northern';

  const [escalations, setEscalations] = useState<EscalationItem[]>([
    {
      id: 'ESC-401',
      applicationId: 'APP2026-0012',
      instituteName: 'ABC Institute of Tech',
      region: 'Northern',
      raisedBy: 'Dr. R. K. Sharma (RO)',
      raisedDate: '29 Oct 2026',
      urgency: 'Critical',
      reason: 'Discrepancy in continuous land ownership deed vs municipal master plan layout.',
      status: 'Open'
    },
    {
      id: 'ESC-402',
      applicationId: 'APP2026-0014',
      instituteName: 'Dehradun College of Engg',
      region: 'Northern',
      raisedBy: 'Dr. R. K. Sharma (RO)',
      raisedDate: '24 Oct 2026',
      urgency: 'High',
      reason: 'EVC committee inspection delayed due to weather emergency; request hybrid mode approval.',
      status: 'Under Review'
    },
    {
      id: 'ESC-403',
      applicationId: 'APP2026-0008',
      instituteName: 'Kanpur Institute of Tech',
      region: 'Northern',
      raisedBy: 'Dr. R. K. Sharma (RO)',
      raisedDate: '15 Oct 2026',
      urgency: 'High',
      reason: 'Faculty cadre ratio query clarification received and forwarded to Central committee.',
      status: 'Resolved'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppId, setNewAppId] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newUrgency, setNewUrgency] = useState<'Medium' | 'High' | 'Critical'>('High');
  const [newReason, setNewReason] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppId || !newReason) return;

    const newItem: EscalationItem = {
      id: `ESC-${Date.now().toString().slice(-4)}`,
      applicationId: newAppId,
      instituteName: newInstName || 'Technical Institution',
      region: region,
      raisedBy: `${user?.name} (RO)`,
      raisedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      urgency: newUrgency,
      reason: newReason,
      status: 'Open'
    };

    setEscalations([newItem, ...escalations]);
    setIsModalOpen(false);
    setNewAppId('');
    setNewInstName('');
    setNewReason('');
    showToast('Escalation dispatched to AICTE Central Regulatory Desk', 'success');
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

      {/* Escalation Cards */}
      <div className="grid grid-cols-1 gap-4">
        {escalations.map((item) => (
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
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    item.urgency === 'Critical'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.urgency} Urgency
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'Under Review'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.reason}
              </p>
              <div className="text-[11px] text-slate-400">
                Raised by {item.raisedBy} on {item.raisedDate}
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-2">
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {item.id}
              </span>
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
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Urgency Level
                </label>
                <select
                  value={newUrgency}
                  onChange={(e) => setNewUrgency(e.target.value as any)}
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
                  className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-sm"
                >
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

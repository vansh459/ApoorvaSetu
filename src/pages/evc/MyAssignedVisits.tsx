import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  FileText,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { EVCVisit } from '../../types';

export const MyAssignedVisits: React.FC = () => {
  const { user } = useAuth();
  const { evcVisits, showToast } = useApp();

  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const [selectedVisit, setSelectedVisit] = useState<EVCVisit | null>(null);
  const [infraScore, setInfraScore] = useState(85);
  const [facultyScore, setFacultyScore] = useState(90);
  const [labScore, setLabScore] = useState(88);
  const [recommendation, setRecommendation] = useState<'Recommended' | 'Conditional' | 'Not Recommended'>('Recommended');
  const [remarks, setRemarks] = useState('');
  const [safetyCompliance, setSafetyCompliance] = useState(true);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    showToast(`Inspection report submitted for ${selectedVisit.instituteName}`, 'success');
    setSelectedVisit(null);
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              EVC Inspection Portal
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Assigned Visits</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Assigned EVC Visits & Inspections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Conduct on-site inspections for institutions under your committee's purview and submit authoritative findings.
          </p>
        </div>
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 gap-4">
        {assignedVisits.map((visit) => (
          <div
            key={visit.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-3 flex-wrap">
                <span className="font-bold text-slate-900 text-base">
                  {visit.instituteName}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {visit.id}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${visit.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                    }`}
                >
                  {visit.status}
                </span>
                <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md">
                  {visit.mode} Inspection
                </span>
              </div>

              <div className="text-xs text-slate-500 flex items-center space-x-4 flex-wrap gap-y-1">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{visit.date || '02 Nov 2026'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{visit.stateRegion} ({visit.region} Region)</span>
                </span>
                <span>Committee: <strong className="text-slate-700">{visit.assignedCommittee}</strong></span>
              </div>
            </div>

            <div className="shrink-0 flex items-center space-x-2.5">
              <button
                onClick={() => setSelectedVisit(visit)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Submit Inspection Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedVisit(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Submit EVC Inspection Report
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Institution: <strong className="text-slate-800">{selectedVisit.instituteName}</strong> ({selectedVisit.id})
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
              {/* Scoring sliders */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Compliance Evaluation Scores (0 - 100)
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">Infrastructure & Land Built-up Area:</span>
                    <span className="font-bold text-amber-700">{infraScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={infraScore}
                    onChange={(e) => setInfraScore(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">Faculty Cadre Ratio & Qualifications:</span>
                    <span className="font-bold text-blue-700">{facultyScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={facultyScore}
                    onChange={(e) => setFacultyScore(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">Laboratory Equipment & Computing Facilities:</span>
                    <span className="font-bold text-teal-700">{labScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={labScore}
                    onChange={(e) => setLabScore(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Final Inspection Recommendation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Recommended', color: 'border-emerald-500 text-emerald-800 bg-emerald-50' },
                    { val: 'Conditional', color: 'border-amber-500 text-amber-800 bg-amber-50' },
                    { val: 'Not Recommended', color: 'border-rose-500 text-rose-800 bg-rose-50' }
                  ].map((rec) => (
                    <button
                      key={rec.val}
                      type="button"
                      onClick={() => setRecommendation(rec.val as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${recommendation === rec.val ? rec.color : 'border-slate-200 text-slate-600 bg-white'
                        }`}
                    >
                      {rec.val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Compliance */}
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={safetyCompliance}
                  onChange={(e) => setSafetyCompliance(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md"
                />
                <span className="font-medium">Fire & safety NOC confirmed and barrier-free ramps verified on campus</span>
              </label>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Committee Detailed Findings & Observations
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Summarize faculty interviews, student ratio audit, and infrastructure condition..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-sm"
                >
                  Sign & Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


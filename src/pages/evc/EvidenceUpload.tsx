import React, { useState } from 'react';
import { UploadCloud, FileText, Image, Trash2, Camera, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { formatDisplayDate } from '../../utils/dates';

export const EvidenceUpload: React.FC = () => {
  const { user } = useAuth();
  const { evcVisits, addVisitEvidence, removeVisitEvidence } = useApp();
  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const [visitId, setVisitId] = useState(assignedVisits[0]?.id ?? '');
  const visit = assignedVisits.find((item) => item.id === visitId);
  const evidenceFiles = visit?.evidenceFiles ?? [];
  const locked = Boolean(visit?.reportSubmitted);

  const handleSimulatedUpload = () => {
    if (!visit || locked) return;
    const title = `EVC_Campus_Inspection_${Date.now().toString().slice(-4)}.jpg`;
    addVisitEvidence(visit.id, title);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            EVC Evidence Repository
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">Tamper-Proof Audit Attachments</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Inspection Evidence & Geotagged Records
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Attach geotagged photographs, laboratory records and attendance audits to the inspection they support.
        </p>
      </div>

      {assignedVisits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">No inspection visit assigned to you</div>
          <p className="text-xs text-slate-500 mt-1">
            Evidence can be attached once a committee visit is scheduled for your region.
          </p>
        </div>
      ) : (
        <>
          {/* Visit selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs font-semibold text-slate-700 shrink-0">Evidence for visit</div>
            <select
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-amber-500"
            >
              {assignedVisits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} — {item.instituteName}
                  {item.date ? ` (${formatDisplayDate(item.date)})` : ''}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 shrink-0">{evidenceFiles.length} files attached</div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={handleSimulatedUpload}
            className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center transition-all group shadow-xs ${
              locked
                ? 'border-slate-200 cursor-not-allowed opacity-70'
                : 'border-amber-300 hover:border-amber-500 cursor-pointer hover:bg-amber-50/20'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Upload Geotagged Inspection Photographs & Evidence
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {locked
                ? 'The inspection report is on record; evidence is locked for audit.'
                : 'Click to attach campus infrastructure photos, laboratory test rigs, or signed biometric registers (JPG, PNG, PDF up to 25 MB).'}
            </p>
          </div>

          {/* Uploaded Evidence List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Attached Evidence ({evidenceFiles.length} records)</span>
              <span className="text-xs text-slate-400 font-normal">Held against {visit?.id}</span>
            </h2>

            {evidenceFiles.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No evidence attached yet. Photographs and registers added here are listed in the signed report.
              </p>
            ) : (
              <div className="space-y-2.5">
                {evidenceFiles.map((title) => (
                  <div
                    key={title}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        {title.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Image className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{title}</div>
                        <div className="text-[11px] text-slate-500">
                          Attached to {visit?.instituteName}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => visit && removeVisitEvidence(visit.id, title)}
                      disabled={locked}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:hover:text-slate-400 shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

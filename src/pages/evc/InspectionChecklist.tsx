import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, CalendarDays, Check, Save, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { EVC_CHECKLIST_SECTIONS, EVC_CHECKLIST_ITEMS } from '../../workflow/evc';
import { formatDisplayDate } from '../../utils/dates';
import { EVCVisitChecklistItem } from '../../types';

export const InspectionChecklist: React.FC = () => {
  const { user } = useAuth();
  const { evcVisits, saveVisitChecklist } = useApp();
  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const [visitId, setVisitId] = useState(assignedVisits[0]?.id ?? '');
  const visit = assignedVisits.find((item) => item.id === visitId);
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              EVC Audit Toolkit
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Standard Operating Procedure</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Inspection Checklist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Standard AICTE Approval Process Handbook (APH) compliance verification criteria.
          </p>
        </div>

        <button
          onClick={() => visit && saveVisitChecklist(visit.id, marks)}
          disabled={!visit || !dirty || visit.reportSubmitted}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm shrink-0 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{dirty ? 'Save Checklist State' : 'Checklist Saved'}</span>
        </button>
      </div>

      {/* Visit selector */}
      {assignedVisits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
          <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">No inspection visit assigned to you</div>
          <p className="text-xs text-slate-500 mt-1">
            The checklist opens once a committee visit is scheduled for your region.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 shrink-0">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <span>Inspection visit</span>
            </div>
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
            <div className="text-[11px] text-slate-500 shrink-0">
              {progress.assessed}/{progress.total} assessed · {progress.failed} deficient
            </div>
          </div>

          {visit?.reportSubmitted && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>The inspection report for this visit is already on record; the checklist is read-only.</span>
            </div>
          )}

          {/* Checklist Sections */}
          <div className="space-y-4">
            {EVC_CHECKLIST_SECTIONS.map((cat) => (
              <div key={cat.category} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  {cat.category}
                </h2>

                <div className="space-y-2">
                  {cat.items.map((item) => {
                    const passed = markById.get(item.id);
                    const assessed = passed !== undefined;
                    const locked = Boolean(visit?.reportSubmitted);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          !assessed
                            ? 'bg-slate-50/60 border-slate-200/70'
                            : passed
                              ? 'bg-emerald-50/40 border-emerald-200/70'
                              : 'bg-rose-50/40 border-rose-200/70'
                        }`}
                      >
                        <div className="flex items-center space-x-3 pr-4">
                          <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">{item.id}</span>
                          <span className={`font-medium ${passed === false ? 'text-rose-900' : 'text-slate-800'}`}>
                            {item.description}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => setItem(item.id, true)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed ${
                              passed === true ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Compliant</span>
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => setItem(item.id, false)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed ${
                              passed === false ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
                            }`}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Deficient</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

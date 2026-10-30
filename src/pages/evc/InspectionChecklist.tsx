import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Check,
  Save
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const InspectionChecklist: React.FC = () => {
  const { showToast } = useApp();

  const [checklist, setChecklist] = useState([
    {
      category: '1. Land & Built-up Space',
      items: [
        { id: '1.1', desc: 'Continuous land parcel verification without public right-of-way bifurcation', passed: true },
        { id: '1.2', desc: 'Approved municipal master plan and building completion certificate on record', passed: true },
        { id: '1.3', desc: 'Administrative and instructional carpet area satisfies minimum norm for proposed intake', passed: true }
      ]
    },
    {
      category: '2. Laboratories & Computing Facilities',
      items: [
        { id: '2.1', desc: 'Minimum 1:4 student to PC ratio with licensed system and application software', passed: true },
        { id: '2.2', desc: 'Dedicated IoT / AI / Emerging Technology lab with equipment operational', passed: true },
        { id: '2.3', desc: 'High-speed internet bandwidth (>100 Mbps dedicated leased line) operational', passed: true }
      ]
    },
    {
      category: '3. Faculty Cadre Ratio & Qualifications',
      items: [
        { id: '3.1', desc: 'Cadre ratio 1:2:6 (Professor : Associate Professor : Assistant Professor) verified', passed: false },
        { id: '3.2', desc: 'Faculty appointment through duly constituted university selection committee', passed: true },
        { id: '3.3', desc: 'Biometric / Aadhaar-based attendance register active and mapped to AICTE portal', passed: true }
      ]
    },
    {
      category: '4. Safety & Inclusive Campus Facilities',
      items: [
        { id: '4.1', desc: 'Valid Fire Safety Certificate from competent state authority', passed: true },
        { id: '4.2', desc: 'Barrier-free environment with ramps, lifts, and disabled-friendly restrooms', passed: false },
        { id: '4.3', desc: 'Anti-Ragging Committee and Internal Complaints Committee (ICC) constituted and displayed', passed: true }
      ]
    }
  ]);

  const toggleItem = (catIdx: number, itemIdx: number) => {
    const updated = [...checklist];
    updated[catIdx].items[itemIdx].passed = !updated[catIdx].items[itemIdx].passed;
    setChecklist(updated);
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
          onClick={() => showToast('Inspection checklist progress saved', 'success')}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Checklist State</span>
        </button>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-4">
        {checklist.map((cat, catIdx) => (
          <div key={cat.category} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              {cat.category}
            </h2>

            <div className="space-y-2">
              {cat.items.map((item, itemIdx) => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(catIdx, itemIdx)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${item.passed
                      ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                      : 'bg-rose-50/40 border-rose-200/70 hover:bg-rose-50/70'
                    }`}
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">
                      {item.id}
                    </span>
                    <span className={`font-medium ${item.passed ? 'text-slate-800' : 'text-rose-900'}`}>
                      {item.desc}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${item.passed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                      }`}
                  >
                    {item.passed ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Compliant</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Deficient</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


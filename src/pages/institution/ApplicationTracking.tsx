import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  MessageSquare,
  Upload,
  Download,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterApplicationsForUser } from '../../services/rbacService';

export const ApplicationTracking: React.FC = () => {
  const { user } = useAuth();
  const { applications, showToast } = useApp();

  const myApps = filterApplicationsForUser(applications, user);
  const activeApp = myApps[0] || {
    id: 'APP2026-0012',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    type: 'Extension of Approval (EoA)',
    appliedDate: '12 Sep 2026',
    lastUpdated: '30 Oct 2026',
    intakeProposed: 480
  };

  const steps = [
    {
      stage: 'Application Submission',
      date: '12 Sep 2026',
      status: 'completed',
      officer: 'Auto-Ack National Gateway',
      note: 'Application fee received. Digital submission verified.'
    },
    {
      stage: 'Regional Document Scrutiny',
      date: '28 Sep 2026',
      status: 'completed',
      officer: 'Dr. R. K. Sharma (Regional Officer - Northern)',
      note: 'Building approval and municipal title cleared.'
    },
    {
      stage: 'Expert Visit Committee (EVC)',
      date: '02 Nov 2026 (Scheduled)',
      status: 'current',
      officer: 'Prof. S. Banerjee (Committee Head, EVC North-A)',
      note: 'Committee constituted. Physical inspection scheduled for 02 Nov 2026, 10:00 AM.'
    },
    {
      stage: 'Compliance & Undertaking Verification',
      date: 'Pending',
      status: 'pending',
      officer: 'AICTE Legal Bureau',
      note: 'Affidavits review following EVC inspection report.'
    },
    {
      stage: 'Final AICTE Approval / EoA Grant',
      date: 'Pending',
      status: 'pending',
      officer: 'Advisor-I (Approval Bureau)',
      note: 'Final letter dispatch upon committee recommendation.'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Real-Time Tracking
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">{user?.instituteName || 'ABC Institute of Tech'}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Application Progress & Regulatory Audit
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Live milestone timeline, regulatory officer communications, and action advisories.
        </p>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold text-blue-700 font-mono">
              {activeApp.id}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-900">
              {activeApp.type}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
            <span>Submitted: {activeApp.appliedDate}</span>
            <span>•</span>
            <span>Intake Proposed: <strong className="text-slate-800">{activeApp.intakeProposed || 480} Seats</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            Current Stage: {activeApp.stage}
          </span>
          <button
            onClick={() => showToast('Application summary downloaded as PDF', 'success')}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Download Application Summary"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          Approval Milestones & Officer Log
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {steps.map((st, idx) => {
            const isDone = st.status === 'completed';
            const isCurrent = st.status === 'current';

            return (
              <div key={st.stage} className="relative flex items-start space-x-4 text-xs">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : isCurrent
                        ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Content Box */}
                <div className="flex-1 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span
                      className={`text-sm font-bold ${isDone ? 'text-slate-900' : isCurrent ? 'text-blue-700 font-extrabold' : 'text-slate-400'
                        }`}
                    >
                      {st.stage}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 font-mono">
                      {st.date}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    Responsible Authority: <strong className="text-slate-800">{st.officer}</strong>
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed mt-2">
                    {st.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


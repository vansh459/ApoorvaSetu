import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  Building2,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  FileClock,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { filterApplicationsForUser, filterEVCVisitsForUser, filterComplianceForUser } from '../../../services/rbacService';

export const InstitutionAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications, evcVisits, complianceRecords, setSelectedApplication, setActiveModal } = useApp();

  // Institution scoped data
  const myApplications = filterApplicationsForUser(applications, user);
  const myVisits = filterEVCVisitsForUser(evcVisits, user);
  const myCompliance = filterComplianceForUser(complianceRecords, user);

  // Active primary application for progress timeline
  const activeApp = myApplications[0] || {
    id: 'APP2026-0012',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    type: 'Extension of Approval (EoA)',
    lastUpdated: '30 Oct 2026'
  };

  const submittedCount = myApplications.length || 3;
  const underReviewCount = myApplications.filter((a) => a.status === 'In Progress' || a.status === 'Pending').length || 1;
  const approvedCount = myApplications.filter((a) => a.status === 'Approved').length || 1;
  const correctionCount = myApplications.filter((a) => a.status === 'Action Required' || a.status === 'Returned').length || 1;

  // Stages definition for timeline
  const timelineStages = [
    { title: 'Application Submitted', date: '12 Sep 2026', status: 'completed' },
    { title: 'Scrutiny Cleared', date: '28 Sep 2026', status: 'completed' },
    { title: 'EVC Visit Scheduled', date: '02 Nov 2026', status: 'current' },
    { title: 'Undertaking Verification', date: 'Pending', status: 'pending' },
    { title: 'Final AICTE Approval', date: 'Pending', status: 'pending' }
  ];

  return (
    <div className="space-y-6">
      {/* Institution Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/60 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
              <Building2 className="w-3 h-3" />
              <span>{user?.instituteName || 'ABC Institute of Tech'}</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-blue-200">
              AICTE PID: {user?.instituteId || 'INST-101'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-300 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 inline" />
              <span>Status: Approved Institution</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Institutional Approval & Compliance Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Track approval lifecycle, respond to regulatory queries, submit mandatory affidavits, and prepare for scheduled inspections.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('/institution/apply')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Apply for New Approval</span>
          </button>
          <button
            onClick={() => navigate('/institution/profile')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Institute Profile</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Key Institution Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications Submitted */}
        <div
          onClick={() => navigate('/applications')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Submitted
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {submittedCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Total Applications Submitted
          </div>
        </div>

        {/* Applications Under Review */}
        <div
          onClick={() => navigate('/institution/tracking')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              Under Review
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {underReviewCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Applications Under Review
          </div>
        </div>

        {/* Approved Applications */}
        <div
          onClick={() => navigate('/applications?status=Approved')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Granted
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {approvedCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Approved Applications
          </div>
        </div>

        {/* Requiring Correction */}
        <div
          onClick={() => navigate('/applications?status=Action+Required')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {correctionCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Pending Corrections
          </div>
        </div>
      </div>

      {/* Row 2: Live Application Progress Timeline & Upcoming EVC Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Application Progress Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {activeApp.id}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-700">
                  {activeApp.type}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                Approval Progress Timeline
              </h2>
            </div>
            <button
              onClick={() => navigate('/institution/tracking')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Full History →
            </button>
          </div>

          {/* Stepper Timeline */}
          <div className="relative pl-6 space-y-4 my-auto before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineStages.map((step, idx) => {
              const isDone = step.status === 'completed';
              const isCurrent = step.status === 'current';

              return (
                <div key={step.title} className="relative flex items-start space-x-3 text-xs">
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <span className="text-[9px] font-bold">{idx + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-bold ${
                          isDone
                            ? 'text-slate-800'
                            : isCurrent
                            ? 'text-blue-700 font-extrabold'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{step.date}</span>
                    </div>
                    {isCurrent && (
                      <p className="text-[11px] text-blue-600 mt-0.5 font-medium leading-tight">
                        Committee formed. Physical visit scheduled for campus audit on 02 Nov 2026.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Stage: Expert Visit Committee (EVC)</span>
            <span className="text-amber-600 font-semibold">Inspection Ready</span>
          </div>
        </div>

        {/* Upcoming EVC Visit Alert (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Scheduled EVC Inspection
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Notice Confirmed
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5 text-xs my-auto">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Inspection Date:</span>
              <span className="font-bold text-slate-900">02 Nov 2026 (10:00 AM IST)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Inspection Mode:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Physical Inspection</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assigned Committee:</span>
              <span className="font-bold text-slate-800">EVC Committee North-A</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Lead Inspector:</span>
              <span className="font-bold text-slate-800">Prof. S. Banerjee</span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 leading-snug">
              ⚠️ Please keep original land title documents, fire safety clearance, and faculty appointment registers ready for the committee.
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/documents')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Verify & Upload Required Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Pending Document Uploads & Mandatory Undertakings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Pending Document Uploads (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Action Required: Pending Documents
              </h2>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              All Documents ({myApplications[0]?.documents?.length || 3}) →
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            {[
              { title: 'Faculty Cadre Ratio Declaration (Form 16 Attached)', deadline: 'Expires in 6 days', status: 'Pending Upload', urgent: true },
              { title: 'Barrier-Free Environment & Ramp Compliance Affidavit', deadline: 'Due by 05 Nov 2026', status: 'Returned with remarks', urgent: true },
              { title: 'Audited Financial Statements AY 2025-26', deadline: 'Verified', status: 'Approved', urgent: false }
            ].map((doc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{doc.title}</div>
                  <div className={`text-[11px] mt-0.5 ${doc.urgent ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                    {doc.deadline}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/documents')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    doc.urgent ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {doc.urgent ? 'Upload File' : 'View'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mandatory Undertakings & Compliance Status (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Institutional Compliance Status
              </h2>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Affidavits →
            </button>
          </div>

          <div className="space-y-3 my-auto">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <span className="font-medium text-slate-700">Anti-Ragging Committee Affidavit</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <span className="font-medium text-slate-700">Land Lease Deed (&gt;30 Years)</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Valid till 2035
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <span className="font-medium text-slate-700">Internal Complaints Committee (ICC)</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                Annual Renewal Pending
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/compliance')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Submit Required Undertakings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

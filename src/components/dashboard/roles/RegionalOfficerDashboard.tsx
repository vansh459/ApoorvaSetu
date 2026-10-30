import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Send,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { filterApplicationsForUser, filterEVCVisitsForUser, filterComplianceForUser } from '../../../services/rbacService';

export const RegionalOfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications, evcVisits, complianceRecords, setSelectedApplication, setActiveModal } = useApp();

  const userRegion = user?.region || 'Northern';

  // Strictly filter records for this regional officer's jurisdiction
  const regionalApps = filterApplicationsForUser(applications, user);
  const regionalVisits = filterEVCVisitsForUser(evcVisits, user);
  const regionalCompliance = filterComplianceForUser(complianceRecords, user);

  // Regional metrics
  const totalRegional = regionalApps.length || 1248;
  const pendingScrutiny = regionalApps.filter((a) => a.stage === 'Scrutiny / Re-scrutiny' || a.stage === 'Submitted').length || 164;
  const forwardedApps = regionalApps.filter((a) => a.stage === 'Expert Visit Committee (EVC)' || a.stage === 'SAC / SHC').length || 412;
  const requiringCorrection = regionalApps.filter((a) => a.status === 'Action Required' || a.status === 'Returned').length || 42;

  // Regional Stage Movement Data
  const regionalStages = [
    { name: 'Submitted / Awaiting Scrutiny', count: 320, percentage: 26, color: '#3b82f6' },
    { name: 'Under Regional Scrutiny', count: 240, percentage: 19, color: '#0ea5e9' },
    { name: 'EVC Visit Coordinated', count: 285, percentage: 23, color: '#8b5cf6' },
    { name: 'Compliance Review', count: 215, percentage: 17, color: '#f59e0b' },
    { name: 'Forwarded to Central AICTE', count: 188, percentage: 15, color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      {/* Regional Jurisdiction Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 border border-teal-800/60 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{userRegion} Regional Office (Kanpur)</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-teal-200">
              Jurisdiction: UP, Uttarakhand, Bihar
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Regional Applications & Inspection Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Conduct document verification, coordinate physical EVC visits, and forward compliant applications to central authorities.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('/documents')}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Verify Documents</span>
          </button>
          <button
            onClick={() => navigate('/regional/escalations')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Escalate Issue</span>
          </button>
        </div>
      </div>

      {/* Row 1: 5 Regional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Regional Applications */}
        <div
          onClick={() => navigate('/applications')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {userRegion}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {totalRegional.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Regional Applications
          </div>
        </div>

        {/* Applications Under Review */}
        <div
          onClick={() => navigate('/applications?status=In+Progress')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              In Review
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {pendingScrutiny}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Under Scrutiny
          </div>
        </div>

        {/* Forwarded to Central */}
        <div
          onClick={() => navigate('/applications')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Send className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
              Forwarded
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {forwardedApps}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Applications Forwarded
          </div>
        </div>

        {/* Requiring Correction */}
        <div
          onClick={() => navigate('/applications?status=Action+Required')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Deficiencies
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {requiringCorrection}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Requiring Correction
          </div>
        </div>

        {/* EVC Visits in Region */}
        <div
          onClick={() => navigate('/evc-scheduling')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Active Visits
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {regionalVisits.length || 8}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Upcoming EVC Visits
          </div>
        </div>
      </div>

      {/* Row 2: Regional Application Movement & Upcoming Regional EVC Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Regional Movement Bars (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Regional Application Movement ({userRegion} Region)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">AY 2026-27</span>
          </div>

          <div className="space-y-3 my-auto">
            {regionalStages.map((stg) => (
              <div key={stg.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{stg.name}</span>
                  <span className="font-bold text-slate-900">
                    {stg.count}{' '}
                    <span className="font-normal text-slate-400">({stg.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${stg.percentage * 3.5}%`, backgroundColor: stg.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Regional EVC Visits (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Upcoming EVC Visits in Region
              </h2>
            </div>
            <button
              onClick={() => navigate('/evc-scheduling')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              All Visits →
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            {[
              { id: '1', date: '02 Nov', name: 'ABC Institute of Tech', city: 'Kanpur', status: 'Scheduled', committee: 'North-A' },
              { id: '2', date: '05 Nov', name: 'GLA Institute of Technology', city: 'Mathura', status: 'Scheduled', committee: 'North-B' },
              { id: '3', date: '09 Nov', name: 'Dehradun Institute of Tech', city: 'Dehradun', status: 'Pending Approval', committee: 'North-A' },
              { id: '4', date: '12 Nov', name: 'Patna College of Engineering', city: 'Patna', status: 'Scheduled', committee: 'East-North' }
            ].map((v) => (
              <div
                key={v.id}
                onClick={() => navigate('/evc-scheduling')}
                className="p-2.5 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex flex-col items-center justify-center font-bold text-[10px] leading-tight">
                    <span>{v.date.split(' ')[0]}</span>
                    <span className="text-[8px] font-semibold uppercase">{v.date.split(' ')[1]}</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">{v.name}</div>
                    <div className="text-[11px] text-slate-500">{v.city} • Comm: {v.committee}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  v.status === 'Scheduled' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Document Verification Queue & Regional Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Pending Document Verification Queue (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Pending Document Verification Queue
              </h2>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
            >
              Verify All Documents →
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            {[
              { id: 'DOC-501', title: 'Land Ownership & Master Plan Deed', inst: 'ABC Institute of Tech', status: 'Pending Review', date: 'Uploaded 2 hrs ago' },
              { id: 'DOC-502', title: 'Fire & Safety NOC Compliance Certificate', inst: 'Kanpur Institute of Tech', status: 'Pending Review', date: 'Uploaded 4 hrs ago' },
              { id: 'DOC-503', title: 'Faculty Cadre Ratio & Form 16 Affidavit', inst: 'Meerut Engineering College', status: 'Returned for Edit', date: 'Resubmitted today' },
              { id: 'DOC-504', title: 'Audited Financial Statements AY 2025-26', inst: 'Dehradun College of Engg', status: 'Pending Review', date: 'Uploaded yesterday' }
            ].map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate('/documents')}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-900">{doc.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {doc.inst} • <span className="text-slate-400">{doc.date}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {doc.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Compliance Overview (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Regional Compliance
              </h2>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              All →
            </button>
          </div>

          <div className="space-y-3 my-auto">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-emerald-950">Verified Undertakings</div>
                <div className="text-[10px] text-emerald-700">Anti-ragging, land compliance</div>
              </div>
              <span className="text-base font-black text-emerald-700">89%</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-amber-950">Pending Undertakings</div>
                <div className="text-[10px] text-amber-700">Barrier-free affidavits</div>
              </div>
              <span className="text-base font-black text-amber-700">28</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-rose-950">Notice Issued</div>
                <div className="text-[10px] text-rose-700">Deadline expiring in 7 days</div>
              </div>
              <span className="text-base font-black text-rose-700">12</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/compliance')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Manage Regional Compliance</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

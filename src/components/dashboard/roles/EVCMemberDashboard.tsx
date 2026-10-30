import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  Building2,
  FileCheck,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { filterEVCVisitsForUser } from '../../../services/rbacService';

export const EVCMemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { evcVisits } = useApp();

  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const completedCount = assignedVisits.filter((v) => v.status === 'Completed').length || 1;
  const upcomingCount = assignedVisits.filter((v) => v.status === 'Scheduled').length || 2;
  const pendingReportCount = assignedVisits.filter((v) => v.status === 'Scheduled' && !v.reportSubmitted).length || 1;

  return (
    <div className="space-y-6">
      {/* Inspector Identification Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 border border-amber-800/50 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
              <ClipboardCheck className="w-3 h-3" />
              <span>{user?.committeeName || 'EVC Committee North-A'}</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-amber-200">
              Assigned Expert Inspector: {user?.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Expert Visit Committee Inspection Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Conduct physical facility audits, evaluate laboratory compliance, capture geotagged evidence, and submit institutional inspection reports.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('/evc/checklist')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Inspection Checklist</span>
          </button>
          <button
            onClick={() => navigate('/evc/my-visits')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Submit Report</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Key EVC Inspector Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Assigned EVC Visits */}
        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Assigned
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {assignedVisits.length || 4}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Total Assigned Visits
          </div>
        </div>

        {/* Upcoming Inspections */}
        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {upcomingCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Upcoming Inspections
          </div>
        </div>

        {/* Pending Inspection Reports */}
        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {pendingReportCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Pending Reports
          </div>
        </div>

        {/* Completed Inspections */}
        <div
          onClick={() => navigate('/evc/my-visits')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {completedCount}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Completed Inspections
          </div>
        </div>
      </div>

      {/* Row 2: Assigned Inspection Schedule & Immediate Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Assigned Inspection Schedule (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Assigned EVC Inspection Visits
              </h2>
            </div>
            <button
              onClick={() => navigate('/evc/my-visits')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
            >
              All My Visits →
            </button>
          </div>

          <div className="space-y-3 my-auto">
            {[
              {
                id: 'EVC-1',
                inst: 'ABC Institute of Tech',
                date: '02 Nov 2026',
                time: '10:00 AM IST',
                mode: 'Physical Inspection',
                location: 'Kanpur, UP',
                status: 'Scheduled',
                appId: 'APP2026-0012'
              },
              {
                id: 'EVC-2',
                inst: 'GLA Institute of Technology',
                date: '08 Nov 2026',
                time: '11:00 AM IST',
                mode: 'Hybrid Inspection',
                location: 'Mathura, UP',
                status: 'Scheduled',
                appId: 'APP2026-0018'
              },
              {
                id: 'EVC-3',
                inst: 'Dehradun Engineering Institute',
                date: '24 Oct 2026',
                time: 'Completed',
                mode: 'Physical Inspection',
                location: 'Dehradun, UK',
                status: 'Completed',
                appId: 'APP2026-0005'
              }
            ].map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{v.inst}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      v.status === 'Scheduled' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{v.date} ({v.time})</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{v.location}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <button
                    onClick={() => navigate('/evc/checklist')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Checklist
                  </button>
                  <button
                    onClick={() => navigate('/evc/my-visits')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Report Submission Alert & Guidelines (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Action Required: Pending Report
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Urgent
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-900 my-auto">
            <div className="font-bold flex items-center space-x-1.5">
              <span>ABC Institute of Technology (APP2026-0012)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Inspection was conducted for extension of approval (EoA). The inspection committee is required to upload laboratory photos, faculty attendance, and submit the final signed recommendation report.
            </p>
            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={() => navigate('/evc/my-visits')}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
              >
                Upload Findings & Submit
              </button>
              <button
                onClick={() => navigate('/evc/evidence')}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-50 cursor-pointer"
              >
                Upload Photos
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1 text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Inspection Authority Scoped</span>
            </span>
            <span className="font-semibold text-slate-700">AICTE Handbook AY 2026-27</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Server,
  ArrowRight,
  UserPlus,
  KeyRound,
  Sliders,
  History
} from 'lucide-react';
import { authService } from '../../../services/authService';
import { regionalOffices } from '../../../data/initialData';
import { useApp } from '../../../context/AppContext';
import { User, Application, AuditLog } from '../../../types';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { applications, institutes } = useApp();
  const users = authService.getUsers();
  const auditLogs = authService.getAuditLogs().slice(0, 5);
  const config = authService.getSystemConfig();

  const activeUsersCount = users.filter((u: User) => u.isActive).length;
  const approvedApps = applications.filter((a: Application) => a.status === 'Approved').length;
  const pendingApps = applications.filter((a: Application) => a.status === 'Pending' || a.status === 'In Progress').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Super Admin Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300">National Governance & System Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Platform Operations & Security Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage all 5 user tiers, configure regulatory workflows, inspect audit trails, and maintain system health.
          </p>
        </div>

        {/* Quick Config Pills */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => navigate('/admin/users')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Manage Users</span>
          </button>
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Row 1: 5 Super Admin Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Registered Users */}
        <div
          onClick={() => navigate('/admin/users')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeUsersCount} Active
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {users.length}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Registered Users
          </div>
        </div>

        {/* Active Institutions */}
        <div
          onClick={() => navigate('/institutes')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {institutes.length}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Active Institutions
          </div>
        </div>

        {/* Total Applications */}
        <div
          onClick={() => navigate('/applications')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              AY 2026-27
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {applications.length}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Total Applications
          </div>
        </div>

        {/* Pending Applications */}
        <div
          onClick={() => navigate('/applications?status=Pending')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Pipeline
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {pendingApps}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Pending Applications
          </div>
        </div>

        {/* Approved Applications */}
        <div
          onClick={() => navigate('/applications?status=Approved')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs card-interactive cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Grant Issued
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">
            {approvedApps}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            Approved Applications
          </div>
        </div>
      </div>

      {/* Row 2: Regional Overview & Role Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Regional Activity Overview (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Regional Jurisdictions & Activity Overview
              </h2>
            </div>
            <button
              onClick={() => navigate('/regions-officials')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Regional Offices →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Region</th>
                  <th className="pb-2">HQ</th>
                  <th className="pb-2">Regional Officer</th>
                  <th className="pb-2 text-right">Institutes</th>
                  <th className="pb-2 text-right">Pending Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {regionalOffices.slice(0, 5).map((ro: any) => (
                  <tr key={ro.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900">{ro.region}</td>
                    <td className="py-2.5 text-slate-600">{ro.headquarters}</td>
                    <td className="py-2.5 text-slate-700 font-medium">{ro.officerName}</td>
                    <td className="py-2.5 text-right text-slate-800 font-bold">{ro.totalInstitutes}</td>
                    <td className="py-2.5 text-right font-bold text-amber-600">{ro.pendingApplications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity & Role Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                User Tier & Role Distribution
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/roles')}
              className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
            >
              Role Matrix →
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            {[
              { role: 'SUPER_ADMIN', label: 'Super Administrators', count: users.filter((u: User) => u.role === 'SUPER_ADMIN').length, color: 'bg-purple-600' },
              { role: 'AICTE_ADMIN', label: 'AICTE Central Officers', count: users.filter((u: User) => u.role === 'AICTE_ADMIN').length, color: 'bg-blue-600' },
              { role: 'REGIONAL_OFFICER', label: 'Regional Officers', count: users.filter((u: User) => u.role === 'REGIONAL_OFFICER').length, color: 'bg-teal-600' },
              { role: 'EVC_MEMBER', label: 'EVC Committee Inspectors', count: users.filter((u: User) => u.role === 'EVC_MEMBER').length, color: 'bg-amber-600' },
              { role: 'INSTITUTION_ADMIN', label: 'Institution Principals & Admins', count: users.filter((u: User) => u.role === 'INSTITUTION_ADMIN').length, color: 'bg-rose-600' }
            ].map((item) => (
              <div key={item.role} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {item.count} accounts
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Security Model: RBAC v4.2</span>
            <span className="text-emerald-600 font-semibold flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Administrative Audit Actions & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Recent Audit Logs (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Recent Administrative Actions & Audit Trail
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Full Logs ({authService.getAuditLogs().length})
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            {auditLogs.map((log: AuditLog) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-start justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{log.userName}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                      {log.userRole}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{log.action}</span>
                  </div>
                  <p className="text-slate-600">{log.details}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-[10px] font-medium text-slate-400">{log.timestamp}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{log.ipAddress}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts & Maintenance Controls (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                System Health & Alerts
              </h2>
            </div>
            <button
              onClick={() => navigate('/admin/system-config')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Config →
            </button>
          </div>

          <div className="space-y-3 my-auto">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-900">National AICTE Gateway</div>
                <div className="text-[10px] text-emerald-700">All services 100% operational</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-900">Academic Year Cycle</div>
                <div className="text-[10px] text-blue-700">AY {config.academicYear} (Cycle Open)</div>
              </div>
              <span className="text-xs font-bold text-blue-700">Active</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-900">Cycle Deadline</div>
                <div className="text-[10px] text-amber-700">{config.approvalCycleEndDate}</div>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                62 Days Left
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/admin/system-config')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure System Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

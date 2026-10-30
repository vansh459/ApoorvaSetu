import React, { useState } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  Server,
  Calendar,
  Users,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { authService } from '../../services/authService';
import { SystemConfig as ConfigType } from '../../types';

export const SystemConfigPage: React.FC = () => {
  const [config, setConfig] = useState<ConfigType>(() => authService.getSystemConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    authService.updateSystemConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Super Admin Control
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Global Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure approval cycle dates, inspection quorum thresholds, and regulatory governance parameters.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Card 1: Academic Cycle Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Academic Year Approval Cycle
              </h2>
              <p className="text-[11px] text-slate-500">
                Define the current national intake cycle and statutory deadline.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Active Academic Year
              </label>
              <input
                type="text"
                value={config.academicYear}
                onChange={(e) => setConfig({ ...config, academicYear: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approval Cycle Cut-off Date
              </label>
              <input
                type="date"
                value={config.approvalCycleEndDate}
                onChange={(e) => setConfig({ ...config, approvalCycleEndDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Card 2: EVC & Inspection Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Inspection & Governance Quorum
              </h2>
              <p className="text-[11px] text-slate-500">
                Mandatory committee thresholds according to AICTE Approval Process Handbook (APH).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Minimum EVC Committee Inspectors
              </label>
              <input
                type="number"
                min={2}
                max={5}
                value={config.evcMinMembers}
                onChange={(e) => setConfig({ ...config, evcMinMembers: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default: 3 members (1 Chairman, 1 Subject Expert, 1 Industry Representative)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Auto-Escalation Threshold (Days)
              </label>
              <input
                type="number"
                min={3}
                max={30}
                value={config.autoEscalationDays}
                onChange={(e) => setConfig({ ...config, autoEscalationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Flag applications automatically if pending review exceeds this limit
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Security & Operational Flags */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Security & Platform Controls
              </h2>
              <p className="text-[11px] text-slate-500">
                System maintenance mode and security triggers.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer">
              <div>
                <div className="font-bold text-slate-900">Portal Maintenance Mode</div>
                <div className="text-[11px] text-slate-500">
                  Suspend new application submissions while leaving administrative review active
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded-md border-slate-300"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer">
              <div>
                <div className="font-bold text-slate-900">Automated Notification Alerts</div>
                <div className="text-[11px] text-slate-500">
                  Dispatch email notifications on status transitions and EVC scheduling
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.notificationEmailAlerts}
                onChange={(e) => setConfig({ ...config, notificationEmailAlerts: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded-md border-slate-300"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-2 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};


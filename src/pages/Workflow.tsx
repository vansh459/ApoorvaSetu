import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Workflow as WorkflowIcon,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Application, ApplicationStage } from '../types';
import { OPERATIONAL_STAGES, STAGE_META, canonicalStage } from '../workflow/stages';

export const Workflow: React.FC = () => {
  const navigate = useNavigate();
  const { applications, setSelectedApplication, setActiveModal } = useApp();

  const [activeStageFilter, setActiveStageFilter] = useState<ApplicationStage>('Expert Visit Committee (EVC)');

  const workflowStages = OPERATIONAL_STAGES.map((stage, index) => {
    const meta = STAGE_META[stage];
    return {
      id: stage,
      number: index + 1,
      title: meta.label,
      description: meta.description,
      avgDays: meta.slaDays,
      count: applications.filter((app) => canonicalStage(app.stage) === stage).length,
      color: meta.color,
      responsible: meta.responsible
    };
  });

  const stageApplications = applications.filter(
    (app: Application) => canonicalStage(app.stage) === canonicalStage(activeStageFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Approval Stages & Workflow Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Visual operational pipeline, SLA monitoring, and stage-wise bottlenecks.
        </p>
      </div>

      {/* Interactive Workflow Pipeline Diagram */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <WorkflowIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              National Approval Lifecycle (AY 2026-27 Process)
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {workflowStages.length} Sequential Verification Gates
          </span>
        </div>

        {/* Pipeline Stepper Horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
          {workflowStages.map((stage) => {
            const isSelected = activeStageFilter === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => setActiveStageFilter(stage.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-100 -translate-y-0.5'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/90 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stage.number}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {stage.count.toLocaleString()}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
                  {stage.title}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  {stage.description}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Target SLA:</span>
                  <span className="font-bold text-slate-700">{stage.avgDays} days</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Stage Deep Dive */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Inspecting Active Stage
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {activeStageFilter}
            </h3>
          </div>

          <button
            onClick={() => navigate(`/applications?stage=${encodeURIComponent(activeStageFilter)}`)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
          >
            <span>Open in Full Applications View</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Applications currently in this stage */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Application ID</th>
                <th className="py-2.5 px-3">Institution Name</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Latest Note / Action Required</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stageApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active sample applications in this stage currently.
                  </td>
                </tr>
              ) : (
                stageApplications.map((app: Application) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-blue-600">{app.id}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{app.instituteName}</td>
                    <td className="py-3 px-3 text-slate-600">{app.region}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-xs">
                      {app.remarks || 'Standard progression without reported deficiencies.'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedApplication(app);
                          setActiveModal('app-detail');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

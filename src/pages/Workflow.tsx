import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow as WorkflowIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Badge, Button, DataTable, PageHeader } from '../components/ui';
import { Application, ApplicationStage } from '../types';
import type { DataTableColumn } from '../components/ui';
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
      count: applications.filter((app) => canonicalStage(app.stage) === stage).length
    };
  });

  const stageApplications = applications.filter(
    (app: Application) => canonicalStage(app.stage) === canonicalStage(activeStageFilter)
  );

  const openDossier = (app: Application) => {
    setSelectedApplication(app);
    setActiveModal('app-detail');
  };

  const columns: DataTableColumn<Application>[] = [
    {
      key: 'id',
      header: 'Application ID',
      render: (app) => <span className="font-semibold text-accent">{app.id}</span>
    },
    {
      key: 'institute',
      header: 'Institution',
      render: (app) => <span className="font-medium">{app.instituteName}</span>
    },
    { key: 'region', header: 'Region', render: (app) => app.region },
    { key: 'status', header: 'Status', render: (app) => <StatusBadge status={app.status} size="sm" /> },
    {
      key: 'remarks',
      header: 'Latest note',
      render: (app) => (
        <span className="line-clamp-1 max-w-xs text-ink-2">
          {app.remarks || 'Standard progression without reported deficiencies.'}
        </span>
      )
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (app) => (
        <Button size="sm" variant="secondary" onClick={() => openDossier(app)}>
          Inspect dossier
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval stages"
        description="The operational pipeline, its service-level targets and the cases sitting in each gate."
        meta={
          <Badge tone="info">
            {workflowStages.length} sequential verification gates
          </Badge>
        }
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <WorkflowIcon className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">National approval lifecycle</h2>
          </div>
          <span className="text-xs text-ink-2">Select a stage to inspect its queue</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workflowStages.map((stage) => {
            const isSelected = activeStageFilter === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStageFilter(stage.id)}
                aria-pressed={isSelected}
                className={`relative rounded-card border p-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-swift active:scale-[0.98] ${
                  isSelected
                    ? 'border-accent bg-accent-soft shadow-raise'
                    : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'
                    }`}
                  >
                    {stage.number}
                  </span>
                  <span className="text-sm font-semibold text-ink">{stage.count.toLocaleString()}</span>
                </div>

                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{stage.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-2">{stage.description}</p>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs">
                  <span className="text-ink-2">Target SLA</span>
                  <span className="font-semibold text-ink">{stage.avgDays} days</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-ink-2">Inspecting active stage</p>
            <h3 className="truncate text-base font-semibold text-ink">{activeStageFilter}</h3>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate(`/applications?stage=${encodeURIComponent(activeStageFilter)}`)}
          >
            Open in applications
          </Button>
        </div>

        <DataTable
          caption={`Applications in ${activeStageFilter}`}
          columns={columns}
          rows={stageApplications}
          rowKey={(app) => app.id}
          minWidth="840px"
          empty="No active sample applications in this stage currently."
        />
      </section>
    </div>
  );
};

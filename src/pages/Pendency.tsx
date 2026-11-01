import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Clock3, Gauge, MapPin, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterApplicationsForUser } from '../services/rbacService';
import { authService } from '../services/authService';
import { resolveWorkflowConfig } from '../workflow/config';
import {
  ageingBuckets,
  bottleneckRanking,
  officerWorkload,
  pipelineMetrics,
  regionStageMatrix,
  stagePendency
} from '../workflow/selectors';
import { OPERATIONAL_STAGES, STAGE_META } from '../workflow/stages';
import { getNow } from '../utils/dates';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatTile
} from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import type { Region } from '../types';

export const Pendency: React.FC = () => {
  const navigate = useNavigate();
  const { applications } = useApp();
  const { user } = useAuth();

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = getNow();

  const scoped = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );

  const metrics = pipelineMetrics(scoped, config, now);
  const stages = stagePendency(scoped, config, now);
  const bottlenecks = bottleneckRanking(stages);
  const ageing = ageingBuckets(scoped, now);
  const matrix = regionStageMatrix(scoped);
  const officers = officerWorkload(scoped, config, now);

  const activeTotal = stages.reduce((sum, row) => sum + row.count, 0);
  const weightedAge = activeTotal
    ? Math.round(
        stages.reduce((sum, row) => sum + row.count * row.averageAgeDays, 0) / activeTotal
      )
    : 0;
  const openStage = (stage: string, region?: string) => {
    const params = new URLSearchParams({ stage });
    if (region) params.set('region', region);
    navigate(`/applications?${params.toString()}`);
  };
  const openRegion = (region: string) =>
    navigate(`/applications?region=${encodeURIComponent(region)}`);

  const stageColumns: DataTableColumn<(typeof stages)[number]>[] = [
    {
      key: 'stage',
      header: 'Stage',
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-ink">{row.label}</div>
          <ProgressBar value={row.share} label={`${row.label} share`} className="mt-1.5 h-1.5 max-w-[180px]" />
        </div>
      )
    },
    { key: 'count', header: 'Active', align: 'right', render: (row) => <span className="font-semibold">{row.count}</span> },
    { key: 'share', header: 'Share', align: 'right', render: (row) => <span className="text-ink-2">{row.share}%</span> },
    {
      key: 'breached',
      header: 'Breached',
      align: 'right',
      render: (row) =>
        row.breached > 0 ? <Badge>{row.breached}</Badge> : <span className="text-ink-3">0</span>
    },
    {
      key: 'dueSoon',
      header: 'Due soon',
      align: 'right',
      render: (row) =>
        row.dueSoon > 0 ? <Badge>{row.dueSoon}</Badge> : <span className="text-ink-3">0</span>
    },
    {
      key: 'age',
      header: 'Avg age',
      align: 'right',
      render: (row) => <span className="text-ink-2">{row.count === 0 ? 'n/a' : `${row.averageAgeDays} d`}</span>
    },
    { key: 'target', header: 'Target', align: 'right', render: (row) => <span className="text-ink-2">{row.slaDays} d</span> },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) =>
        row.count > 0 ? (
          <Button size="sm" variant="secondary" onClick={() => openStage(row.stage)}>
            Inspect
          </Button>
        ) : null
    }
  ];

  const matrixColumns: DataTableColumn<(typeof matrix)[number]>[] = [
    {
      key: 'region',
      header: 'Region',
      render: (row) => (
        <button
          type="button"
          onClick={() => openRegion(row.region)}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {row.region}
        </button>
      )
    },
    ...OPERATIONAL_STAGES.map((stage) => ({
      key: stage as string,
      header: STAGE_META[stage].shortLabel,
      align: 'center' as const,
      render: (row: (typeof matrix)[number]) => {
        const count = row.counts[stage];
        return count > 0 ? (
          <button
            type="button"
            onClick={() => openStage(stage, row.region as Region)}
            className="min-w-[32px] rounded-[6px] px-1.5 py-0.5 font-medium text-ink transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
          >
            {count}
          </button>
        ) : (
          <span className="text-ink-3">0</span>
        );
      }
    })),
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="font-semibold">{row.total}</span>
    }
  ];

  const officerColumns: DataTableColumn<(typeof officers)[number]>[] = [
    { key: 'officer', header: 'Officer or committee', render: (row) => <span className="font-medium">{row.officer}</span> },
    { key: 'count', header: 'Active', align: 'right', render: (row) => <span className="font-semibold">{row.count}</span> },
    {
      key: 'breached',
      header: 'Breached',
      align: 'right',
      render: (row) =>
        row.breached > 0 ? <Badge>{row.breached}</Badge> : <span className="text-ink-3">0</span>
    },
    {
      key: 'stages',
      header: 'Stages held',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.stages.map((stage) => (
            <Badge key={stage}>
              {STAGE_META[stage].shortLabel}
            </Badge>
          ))}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendency and workload"
        description="Where applications are waiting, which stages are breaching their service level, and who is carrying the load."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active applications"
          value={activeTotal.toLocaleString()}
          delta={`${metrics.approved.toLocaleString()} approved, ${metrics.rejected.toLocaleString()} rejected`}
          icon={Gauge}
        />
        <StatTile
          label="Breached stage SLA"
          value={metrics.breached.toLocaleString()}
          delta="Past the target completion date"
         
          icon={AlertTriangle}
        />
        <StatTile
          label="Due today or approaching"
          value={(metrics.dueToday + metrics.approaching).toLocaleString()}
          delta={`${metrics.dueToday.toLocaleString()} due today`}
         
          icon={Clock3}
        />
        <StatTile
          label="Average days in stage"
          value={`${weightedAge} days`}
          delta="Across every active application"
          icon={TrendingUp}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Stage pendency</h2>
            <p className="mt-0.5 max-w-[62ch] text-sm text-ink-2 [text-wrap:pretty]">
              Active applications by current stage, with target days from the workflow configuration.
            </p>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/applications')}
          >
            Open applications
          </Button>
        </div>
        <DataTable
          caption="Active applications by stage with breach and ageing detail"
          columns={stageColumns}
          rows={stages}
          rowKey={(row) => row.stage}
          minWidth="880px"
          empty={
            <EmptyState
              title="No active applications"
              description="Nothing is waiting in your jurisdiction right now."
            />
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-ink">Ageing profile</h2>
          <p className="mt-0.5 text-sm text-ink-2">
            How long active applications have sat in their current stage.
          </p>

          {activeTotal === 0 ? (
            <EmptyState
              title="No active applications"
              description="Nothing is waiting in your jurisdiction right now."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {ageing.map((bucket, index) => (
                <div key={bucket.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{bucket.label}</span>
                    <span className="text-ink-2">
                      <span className="font-semibold text-ink">{bucket.count}</span>, {bucket.share}%
                    </span>
                  </div>
                  <ProgressBar
                    value={bucket.share}
                    tone={index >= 3 ? 'danger' : index === 2 ? 'warning' : 'info'}
                    label={`${bucket.label} applications`}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Bottleneck ranking</h2>
          <p className="mt-0.5 text-sm text-ink-2">
            Ranked by breaches, applications nearing their deadline and average age.
          </p>

          {bottlenecks.length === 0 ? (
            <EmptyState title="No bottlenecks" description="No active applications to rank." />
          ) : (
            <ol className="mt-4 space-y-1">
              {bottlenecks.slice(0, 5).map((row, index) => (
                <li key={row.stage}>
                  <button
                    type="button"
                    onClick={() => openStage(row.stage)}
                    className="flex w-full items-center gap-3 rounded-control p-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{row.shortLabel}</span>
                      <span className="mt-0.5 block text-xs text-ink-2">
                        {row.count} active, {row.breached} breached, {row.dueSoon} due soon,{' '}
                        {row.averageAgeDays} d average
                      </span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
          <div>
            <h2 className="text-sm font-semibold text-ink">Region and stage matrix</h2>
            <p className="mt-0.5 max-w-[62ch] text-sm text-ink-2 [text-wrap:pretty]">
              Active applications by region. Select a count to inspect that cohort.
            </p>
          </div>
        </div>
        <DataTable
          caption="Active applications by region and stage"
          columns={matrixColumns}
          rows={matrix}
          rowKey={(row) => row.region}
          minWidth="860px"
          empty={<EmptyState title="No active applications" description="Nothing is waiting in your jurisdiction right now." />}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-start gap-2.5">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
          <div>
            <h2 className="text-sm font-semibold text-ink">Officer workload</h2>
            <p className="mt-0.5 max-w-[62ch] text-sm text-ink-2 [text-wrap:pretty]">
              Active applications grouped by the officer or committee accountable for the current stage.
            </p>
          </div>
        </div>
        <DataTable
          caption="Active applications grouped by accountable officer or committee"
          columns={officerColumns}
          rows={officers}
          rowKey={(row) => row.officer}
          minWidth="640px"
          empty={<EmptyState title="No active applications" description="Nothing is waiting in your jurisdiction right now." />}
        />
      </section>
    </div>
  );
};

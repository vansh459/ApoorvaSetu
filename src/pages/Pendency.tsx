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

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

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
  const ageingMax = Math.max(1, ...ageing.map((bucket) => bucket.count));
  const openStage = (stage: string, region?: string) => {
    const params = new URLSearchParams({ stage });
    if (region) params.set('region', region);
    navigate(`/applications?${params.toString()}`);
  };
  const openRegion = (region: string) =>
    navigate(`/applications?region=${encodeURIComponent(region)}`);

  const kpis = [
    {
      label: 'Active applications',
      value: activeTotal.toLocaleString(),
      note: `${metrics.approved.toLocaleString()} approved · ${metrics.rejected.toLocaleString()} rejected`,
      icon: Gauge,
      tone: 'text-blue-600 bg-blue-50 border-blue-100'
    },
    {
      label: 'Breached stage SLA',
      value: metrics.breached.toLocaleString(),
      note: 'Past the target completion date',
      icon: AlertTriangle,
      tone: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    {
      label: 'Due today or approaching',
      value: (metrics.dueToday + metrics.approaching).toLocaleString(),
      note: `${metrics.dueToday.toLocaleString()} due today`,
      icon: Clock3,
      tone: 'text-amber-600 bg-amber-50 border-amber-100'
    },
    {
      label: 'Average days in stage',
      value: `${weightedAge} days`,
      note: 'Across every active application',
      icon: TrendingUp,
      tone: 'text-slate-700 bg-slate-50 border-slate-200'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Pendency and workload
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Where applications are waiting, which stages are breaching their service level, and
          who is carrying the load.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600 leading-tight">
                  {item.label}
                </span>
                <span
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${item.tone}`}
                >
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-3">
                {item.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{item.note}</div>
            </div>
          );
        })}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Stage pendency</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active applications by current stage, with target days from the workflow configuration.
            </p>
          </div>
          <button
            onClick={() => navigate('/applications')}
            className={`text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer rounded ${focusRing}`}
          >
            Open applications
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Stage</th>
                <th className="py-2.5 px-3 text-right">Active</th>
                <th className="py-2.5 px-3 text-right">Share</th>
                <th className="py-2.5 px-3 text-right">Breached</th>
                <th className="py-2.5 px-3 text-right">Due soon</th>
                <th className="py-2.5 px-3 text-right">Avg age</th>
                <th className="py-2.5 px-3 text-right">Target</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stages.map((row) => (
                <tr key={row.stage} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 min-w-[200px]">
                    <div className="font-semibold text-slate-800">{row.label}</div>
                    <div className="mt-1.5 h-1.5 w-full max-w-[180px] rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.share}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{row.count}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{row.share}%</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={
                        row.breached > 0 ? 'font-bold text-rose-600' : 'text-slate-400'
                      }
                    >
                      {row.breached}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={row.dueSoon > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}>
                      {row.dueSoon}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {row.count === 0 ? '—' : `${row.averageAgeDays} d`}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">{row.slaDays} d</td>
                  <td className="py-3 px-3 text-right">
                    {row.count > 0 && (
                      <button
                        onClick={() => openStage(row.stage)}
                        className={`px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-semibold text-[11px] hover:bg-blue-600 hover:text-white transition-colors cursor-pointer ${focusRing}`}
                      >
                        Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-800">Ageing profile</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            How long active applications have sat in their current stage.
          </p>

          {activeTotal === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No active applications in your jurisdiction.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {ageing.map((bucket, index) => (
                <div key={bucket.key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-600">{bucket.label}</span>
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-800">{bucket.count}</span> · {bucket.share}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        index >= 3 ? 'bg-rose-500' : index === 2 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.round((bucket.count / ageingMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-800">Bottleneck ranking</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranked by breaches, applications nearing their deadline and average age.
          </p>

          {bottlenecks.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No active applications to rank.
            </p>
          ) : (
            <ol className="mt-4 space-y-2.5">
              {bottlenecks.slice(0, 5).map((row, index) => (
                <li key={row.stage}>
                  <button
                    onClick={() => openStage(row.stage)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer text-left ${focusRing}`}
                  >
                    <span
                      className="w-6 h-6 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: row.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-slate-800 truncate">
                        {row.shortLabel}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {row.count} active · {row.breached} breached · {row.dueSoon} due soon ·{' '}
                        {row.averageAgeDays} d average
                      </span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Region and stage matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active applications by region. Select a count to inspect that cohort.
            </p>
          </div>
        </div>

        {matrix.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No active applications in your jurisdiction.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Region</th>
                  {OPERATIONAL_STAGES.map((stage) => (
                    <th key={stage} className="py-2.5 px-2 text-center whitespace-nowrap">
                      {STAGE_META[stage].shortLabel}
                    </th>
                  ))}
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix.map((row) => (
                  <tr key={row.region} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openRegion(row.region)}
                        className={`font-semibold text-slate-800 hover:text-blue-700 cursor-pointer rounded ${focusRing}`}
                      >
                        {row.region}
                      </button>
                    </td>
                    {OPERATIONAL_STAGES.map((stage) => {
                      const count = row.counts[stage];
                      return (
                        <td key={stage} className="py-3 px-2 text-center">
                          {count > 0 ? (
                            <button
                              onClick={() => openStage(stage, row.region)}
                              className={`min-w-[28px] px-1.5 py-0.5 rounded-md font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer ${focusRing}`}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex items-start gap-2">
          <Users className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Officer workload</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active applications grouped by the officer or committee accountable for the current
              stage.
            </p>
          </div>
        </div>

        {officers.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No active applications in your jurisdiction.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Officer or committee</th>
                  <th className="py-2.5 px-3 text-right">Active</th>
                  <th className="py-2.5 px-3 text-right">Breached</th>
                  <th className="py-2.5 px-4">Stages held</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((row) => (
                  <tr key={row.officer} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.officer}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{row.count}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={row.breached > 0 ? 'font-bold text-rose-600' : 'text-slate-400'}
                      >
                        {row.breached}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {row.stages.map((stage) => (
                          <span
                            key={stage}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                          >
                            {STAGE_META[stage].shortLabel}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

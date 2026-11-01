import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock3, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEMO_CLOCK_PRESETS, SEED_SCENARIOS } from '../data/seedScenarios';
import type { SeedScenarioTier } from '../data/seedScenarios';
import { formatDisplayDate, getNow } from '../utils/dates';

const TIER_STYLE: Record<SeedScenarioTier, string> = {
  'On Track': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Approaching: 'bg-amber-50 text-amber-700 border-amber-200',
  'Due Today': 'bg-orange-50 text-orange-700 border-orange-200',
  Breached: 'bg-rose-50 text-rose-700 border-rose-200',
  Paused: 'bg-slate-100 text-slate-600 border-slate-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  Expired: 'bg-rose-50 text-rose-700 border-rose-200',
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200'
};

export const DemoScenarios: React.FC = () => {
  const navigate = useNavigate();
  const { demoClockOffsetDays, setDemoClockOffset } = useApp();
  const now = getNow();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Demo scenarios</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Every seeded case below is anchored to the day the demo starts, so the SLA tiers stay true
          however long the project sits between walkthroughs.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2">
            <Clock3 className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Demo clock</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Today is {formatDisplayDate(now)}. Advance the clock to watch reminders and
                escalations climb without waiting for real days to pass.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1 self-start sm:self-auto">
            Offset {demoClockOffsetDays === 0 ? 'today' : `+${demoClockOffsetDays} day(s)`}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DEMO_CLOCK_PRESETS.map((preset) => {
            const active = preset.days === demoClockOffsetDays;
            return (
              <button
                key={preset.days}
                type="button"
                aria-pressed={active}
                onClick={() => setDemoClockOffset(preset.days)}
                className={`text-left rounded-xl border p-3 transition-colors cursor-pointer active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  active
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                }`}
              >
                <span
                  className={`block text-xs font-bold ${
                    active ? 'text-blue-700' : 'text-slate-800'
                  }`}
                >
                  {preset.label}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{preset.hint}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500 mt-3">
          The clock only affects deadline evaluation. It never approves, rejects or verifies a case;
          those actions still need an authorised officer.
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex items-start gap-2">
          <FlaskConical className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Seeded scenes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each scene names the record, the tier you should see, and the control that proves the
              rule.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
          {SEED_SCENARIOS.map((scenario) => (
            <article
              key={scenario.id}
              className="flex flex-col rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {scenario.title}
                </h3>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIER_STYLE[scenario.tier]}`}
                >
                  {scenario.tier}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">{scenario.entityType}</span>
                <span className="font-mono">{scenario.entityId}</span>
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{scenario.summary}</p>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                <span className="font-semibold text-slate-600">What to check. </span>
                {scenario.lookFor}
              </p>

              <button
                type="button"
                onClick={() => navigate(scenario.link)}
                className="mt-3 self-start inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 active:text-blue-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {scenario.linkLabel}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

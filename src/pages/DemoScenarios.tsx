import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEMO_CLOCK_PRESETS, SEED_SCENARIOS } from '../data/seedScenarios';
import { formatDisplayDate, getNow } from '../utils/dates';
import { statusTone } from '../utils/statusTone';
import { Badge, Button, Card, PageHeader } from '../components/ui';

export const DemoScenarios: React.FC = () => {
  const navigate = useNavigate();
  const { demoClockOffsetDays, setDemoClockOffset } = useApp();
  const now = getNow();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo scenarios"
        description="Every seeded case below is anchored to the day the demo starts, so the SLA tiers stay true however long the project sits between walkthroughs."
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
            <div>
              <h2 className="text-sm font-semibold text-ink">Demo clock</h2>
              <p className="mt-0.5 text-sm text-ink-2">
                Today is {formatDisplayDate(now)}. Advance the clock to watch reminders and
                escalations climb without waiting for real days to pass.
              </p>
            </div>
          </div>
          <Badge tone="neutral" className="self-start sm:self-auto">
            Offset {demoClockOffsetDays === 0 ? 'today' : `+${demoClockOffsetDays} day(s)`}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-1 rounded-control border border-line bg-surface-2 p-1 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_CLOCK_PRESETS.map((preset) => {
            const active = preset.days === demoClockOffsetDays;
            return (
              <button
                key={preset.days}
                type="button"
                aria-pressed={active}
                onClick={() => setDemoClockOffset(preset.days)}
                className={`rounded-[8px] border p-3 text-left transition-[background-color,border-color,box-shadow] duration-150 ${
                  active
                    ? 'border-line bg-surface shadow-raise'
                    : 'border-transparent hover:bg-surface/60'
                }`}
              >
                <span className={`block text-sm font-semibold ${active ? 'text-ink' : 'text-ink-2'}`}>
                  {preset.label}
                </span>
                <span className="mt-0.5 block text-xs text-ink-2">{preset.hint}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-ink-2">
          The clock only affects deadline evaluation. It never approves, rejects or verifies a case;
          those actions still need an authorised officer.
        </p>
      </Card>

      <Card padded="none">
        <div className="flex items-start gap-2.5 border-b border-line p-5">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
          <div>
            <h2 className="text-sm font-semibold text-ink">Seeded scenes</h2>
            <p className="mt-0.5 text-sm text-ink-2">
              Each scene names the record, the tier you should see, and the control that proves the
              rule.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
          {SEED_SCENARIOS.map((scenario) => (
            <article
              key={scenario.id}
              className="flex flex-col rounded-card border border-line p-4 transition-colors duration-150 hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-tight text-ink">{scenario.title}</h3>
                <Badge tone={statusTone(scenario.tier)}>{scenario.tier}</Badge>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-2">
                <span className="font-medium text-ink">{scenario.entityType}</span>
                <span className="font-mono">{scenario.entityId}</span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-ink-2">{scenario.summary}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">
                <span className="font-semibold text-ink">What to check. </span>
                {scenario.lookFor}
              </p>

              <Button
                variant="link"
                size="sm"
                className="mt-3 self-start"
                onClick={() => navigate(scenario.link)}
              >
                {scenario.linkLabel}
              </Button>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
};

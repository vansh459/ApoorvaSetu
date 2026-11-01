import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Check, ClipboardList, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { buildEVCQueue } from '../../workflow/evc';
import type { EVCQueueState } from '../../workflow/evc';
import { getStageMeta } from '../../workflow/stages';
import { routeForApplication } from '../../workflow/routes';
import { formatDisplayDate } from '../../utils/dates';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  StatTile,
  Tabs
} from '../../components/ui';
import type { Tone } from '../../utils/statusTone';

const STATE_TONE: Record<EVCQueueState, Tone> = {
  'Report overdue': 'danger',
  'Awaiting scheduling': 'warning',
  Scheduled: 'info',
  Completed: 'success'
};

const STATES = [
  'All',
  'Awaiting scheduling',
  'Scheduled',
  'Report overdue',
  'Completed'
] as const;

export const EVCQueue: React.FC = () => {
  const { user } = useAuth();
  const { applications, evcVisits, setSelectedApplication, setActiveModal } = useApp();

  const [stateFilter, setStateFilter] = useState<'All' | EVCQueueState>('All');
  const [search, setSearch] = useState('');

  const scopedApplications = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );

  const rows = useMemo(
    () => buildEVCQueue(scopedApplications, evcVisits),
    [scopedApplications, evcVisits]
  );

  const filtered = rows.filter((row) => {
    const matchesState = stateFilter === 'All' || row.state === stateFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      row.application.id.toLowerCase().includes(term) ||
      row.application.instituteName.toLowerCase().includes(term) ||
      (row.visit?.assignedCommittee ?? '').toLowerCase().includes(term);
    return matchesState && matchesSearch;
  });

  const counts = {
    awaiting: rows.filter((row) => row.state === 'Awaiting scheduling').length,
    scheduled: rows.filter((row) => row.state === 'Scheduled').length,
    overdue: rows.filter((row) => row.state === 'Report overdue').length,
    completed: rows.filter((row) => row.state === 'Completed').length
  };

  const openCase = (applicationId: string) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) return;
    setSelectedApplication(application);
    setActiveModal('app-detail');
  };

  const scheduleVisit = (applicationId: string) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) return;
    setSelectedApplication(application);
    setActiveModal('schedule-evc');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="EVC work queue"
        description="Every case that has reached the Expert Visit Committee stage, with its inspection and report deadline."
        meta={
          <>
            <Badge>Inspection operations</Badge>
            <span className="text-xs text-ink-2">Route-derived queue</span>
          </>
        }
        actions={
          <Button
            onClick={() => setActiveModal('schedule-evc')}
            icon={<CalendarPlus className="h-4 w-4" />}
          >
            Schedule visit
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Awaiting scheduling"
          value={counts.awaiting}
          delta="No active visit linked"
         
        />
        <StatTile
          label="Scheduled"
          value={counts.scheduled}
          delta="Committee constituted"
         
        />
        <StatTile
          label="Report overdue"
          value={counts.overdue}
          delta="Past the report SLA"
         
        />
        <StatTile label="Completed" value={counts.completed} delta="Report on record" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Field label="Search" htmlFor="evc-queue-search" className="w-full md:max-w-sm">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                aria-hidden="true"
              />
              <Input
                id="evc-queue-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Case, institute or committee"
                className="pl-9"
              />
            </div>
          </Field>

          <Tabs
            items={STATES.map((state) => ({ id: state, label: state }))}
            value={stateFilter}
            onChange={(value) => setStateFilter(value as 'All' | EVCQueueState)}
            ariaLabel="Filter by queue state"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Nothing in this queue"
            description="Forward a case to the Expert Visit Committee stage and it will appear here for scheduling."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ application, visit, state, daysOverdue }) => (
            <Card key={application.id} padded="sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {application.instituteName}
                    </span>
                    <span className="rounded-control bg-surface-2 px-2 py-0.5 font-mono text-xs text-ink-2">
                      {application.id}
                    </span>
                    <Badge tone={STATE_TONE[state]}>{state}</Badge>
                    {daysOverdue > 0 && (
                      <Badge className="gap-1">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {daysOverdue} days overdue
                      </Badge>
                    )}
                  </div>

                  <p className="text-label text-ink-2">
                    {routeForApplication(application).label}, stage{' '}
                    {getStageMeta(application.stage).label}, {application.region} region
                  </p>

                  <p className="text-label text-ink-2">
                    {visit ? (
                      <>
                        Visit {formatDisplayDate(visit.date)}, {visit.assignedCommittee}
                      </>
                    ) : (
                      <span className="text-warning">No visit scheduled</span>
                    )}
                  </p>

                  {visit?.reportSubmitted ? (
                    <p className="flex items-center gap-1.5 text-label text-success">
                      <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      Report {visit.report?.id} submitted,{' '}
                      {visit.report?.recommendations ?? 'on record'}
                    </p>
                  ) : visit?.reportDueAt ? (
                    <p className="text-label text-ink-2">
                      Report due {formatDisplayDate(visit.reportDueAt)}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
                  {state === 'Awaiting scheduling' && (
                    <Button
                      size="sm"
                      onClick={() => scheduleVisit(application.id)}
                      icon={<CalendarPlus className="h-3.5 w-3.5" />}
                    >
                      Schedule visit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openCase(application.id)}
                  >
                    Open case
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

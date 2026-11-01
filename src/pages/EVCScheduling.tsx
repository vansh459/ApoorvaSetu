import React, { useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Clock,
  MapPin,
  Plus,
  Search,
  Users,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterEVCVisitsForUser } from '../services/rbacService';
import { StatusBadge } from '../components/common/StatusBadge';
import { checklistProgress } from '../workflow/evc';
import { formatDisplayDate, getNow, toIsoDate } from '../utils/dates';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  StatTile,
  Tabs
} from '../components/ui';
import { EVCVisit } from '../types';

export const EVCScheduling: React.FC = () => {
  const { evcVisits, setActiveModal, cancelEVC, rescheduleEVC } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [newDateInput, setNewDateInput] = useState(toIsoDate(getNow()));

  const scopedVisits = React.useMemo(() => {
    return filterEVCVisitsForUser(evcVisits, user);
  }, [evcVisits, user]);

  const filteredVisits = scopedVisits.filter((v: EVCVisit) => {
    const matchesSearch =
      v.instituteName.toLowerCase().includes(search.toLowerCase()) ||
      v.assignedCommittee.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = regionFilter === 'All' || v.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const scheduledCount = scopedVisits.filter((v: EVCVisit) => v.status === 'Scheduled').length;
  const pendingCount = scopedVisits.filter((v: EVCVisit) => v.status === 'Pending').length;
  const completedCount = scopedVisits.filter((v: EVCVisit) => v.status === 'Completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="EVC scheduling"
        description="Coordinate physical and hybrid inspection committees, then verify infrastructure and labs."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setActiveModal('schedule-evc')}>
            Schedule new EVC visit
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total inspections" value={evcVisits.length} delta="Constituted teams" icon={CalendarDays} />
        <StatTile label="Confirmed" value={scheduledCount} delta="Ready for on-site" icon={CalendarDays} />
        <StatTile label="Pending constitution" value={pendingCount} delta="Awaiting experts" icon={Clock} />
        <StatTile label="Completed reports" value={completedCount} delta="Submitted to council" icon={ClipboardList} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by institute name or committee"
                aria-label="Search EVC visits"
                className="pl-9"
              />
            </div>

            <Select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              aria-label="Filter by region"
              className="sm:w-44"
            >
              <option value="All">All regions</option>
              <option value="Northern">Northern</option>
              <option value="Southern">Southern</option>
              <option value="Eastern">Eastern</option>
              <option value="Western">Western</option>
              <option value="Central">Central</option>
              <option value="North Eastern">North Eastern</option>
            </Select>
          </div>

          <Tabs
            ariaLabel="EVC visit view"
            items={[
              { id: 'list', label: 'List' },
              { id: 'calendar', label: 'Calendar' }
            ]}
            value={viewMode}
            onChange={(id) => setViewMode(id as 'list' | 'calendar')}
            className="self-end md:self-auto"
          />
        </div>
      </Card>

      {rescheduleTargetId && (
        <Card className="pop-enter">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Reschedule visit {rescheduleTargetId}</h2>
              <p className="mt-0.5 text-sm text-ink-2">
                Choose the new on-site date and re-notify the committee members.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="New date" htmlFor="reschedule-date" className="sm:w-44">
                <Input
                  id="reschedule-date"
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                />
              </Field>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    rescheduleEVC(rescheduleTargetId, newDateInput);
                    setRescheduleTargetId(null);
                  }}
                >
                  Update date
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRescheduleTargetId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {filteredVisits.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No visits match these filters"
            description="Clear the search or choose a different region."
          />
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredVisits.map((visit: EVCVisit) => (
            <Card key={visit.id} padded="sm" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-card border border-line bg-surface-2 text-center">
                  <span className="text-lg font-semibold leading-none text-ink">{visit.displayDate.day}</span>
                  <span className="mt-1 text-xs leading-none text-ink-2">{visit.displayDate.month}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{visit.instituteName}</h3>
                    <StatusBadge status={visit.status} size="sm" />
                    <Badge>{visit.mode}</Badge>
                  </div>

                  <p className="flex items-center gap-1 text-xs text-ink-2">
                    <MapPin className="h-3.5 w-3.5 text-ink-3" />
                    <span>{visit.stateRegion}</span>
                  </p>

                  <div className="flex items-center gap-1.5 pt-1 text-xs text-ink-2">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>Committee: {visit.assignedCommittee}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-ink-2">
                    {visit.applicationId && <span>Case {visit.applicationId}</span>}
                    {visit.reportDueAt && <span>Report due {formatDisplayDate(visit.reportDueAt)}</span>}
                    {visit.reportSubmitted ? (
                      <span className="font-medium text-success">
                        Report submitted{' '}
                        {visit.reportSubmittedAt ? formatDisplayDate(visit.reportSubmittedAt) : ''}
                      </span>
                    ) : (
                      <span>
                        Checklist {checklistProgress(visit).assessed}/{checklistProgress(visit).total}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 items-center justify-end gap-2 border-t border-line pt-2 md:w-auto md:border-t-0 md:pt-0">
                {visit.status !== 'Completed' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setRescheduleTargetId(visit.id);
                      setNewDateInput(visit.date || toIsoDate(getNow()));
                    }}
                  >
                    Reschedule
                  </Button>
                )}

                <Button
                  size="sm"
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/evc/queue')}
                >
                  EVC queue
                </Button>

                {visit.status !== 'Cancelled' && visit.status !== 'Completed' && (
                  <IconButton label="Cancel visit" size="sm" onClick={() => cancelEVC(visit.id)}>
                    <XCircle className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map((visit: EVCVisit) => (
            <Card key={visit.id} className="flex flex-col justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge>{visit.date}</Badge>
                  <StatusBadge status={visit.status} size="sm" />
                </div>

                <h3 className="text-sm font-semibold text-ink">{visit.instituteName}</h3>
                <p className="mt-1 text-xs text-ink-2">{visit.stateRegion}</p>

                <div className="mt-3 rounded-control bg-surface-2 p-3 text-xs">
                  <div className="font-medium text-ink">Committee</div>
                  <div className="mt-0.5 text-ink-2">{visit.assignedCommittee}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-2 text-xs">
                <span className="text-ink-2">Mode: {visit.mode}</span>
                <Button variant="link" size="sm" onClick={() => setRescheduleTargetId(visit.id)}>
                  Change date
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

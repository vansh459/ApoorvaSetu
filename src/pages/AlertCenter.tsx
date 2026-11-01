import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCheck,
  RefreshCw,
  Search,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterAlertsForUser } from '../services/rbacService';
import { alertSummary } from '../workflow/selectors';
import { severityTone, statusTone } from '../utils/statusTone';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Notice,
  PageHeader,
  Select,
  StatTile,
  Tabs
} from '../components/ui';
import type { SystemAlert } from '../types';

type StatusFilter = 'Active' | 'Open' | 'Acknowledged' | 'Resolved' | 'All';
type SeverityFilter = 'All' | SystemAlert['severity'];
type EntityFilter = 'All' | SystemAlert['entityType'];

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'Active', label: 'Active' },
  { key: 'Open', label: 'Open' },
  { key: 'Acknowledged', label: 'Acknowledged' },
  { key: 'Resolved', label: 'Resolved' },
  { key: 'All', label: 'All' }
];

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const AlertCenter: React.FC = () => {
  const { alerts, runSweep, acknowledgeAlert, resolveAlert } = useApp();
  const { user, hasPermission } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('All');
  const [search, setSearch] = useState('');

  const scoped = useMemo(() => filterAlertsForUser(alerts, user), [alerts, user]);
  const summary = alertSummary(scoped);

  const canResolve =
    hasPermission('applications.review') ||
    hasPermission('compliance.verify') ||
    hasPermission('documents.verify');

  const statusCounts: Record<StatusFilter, number> = {
    Active: scoped.filter((alert) => alert.status !== 'Resolved').length,
    Open: scoped.filter((alert) => alert.status === 'Open').length,
    Acknowledged: scoped.filter((alert) => alert.status === 'Acknowledged').length,
    Resolved: scoped.filter((alert) => alert.status === 'Resolved').length,
    All: scoped.length
  };

  const query = search.trim().toLowerCase();
  const rows = scoped
    .filter((alert) => {
      if (statusFilter === 'Active' && alert.status === 'Resolved') return false;
      if (statusFilter === 'Open' && alert.status !== 'Open') return false;
      if (statusFilter === 'Acknowledged' && alert.status !== 'Acknowledged') return false;
      if (statusFilter === 'Resolved' && alert.status !== 'Resolved') return false;
      if (severityFilter !== 'All' && alert.severity !== severityFilter) return false;
      if (entityFilter !== 'All' && alert.entityType !== entityFilter) return false;
      if (!query) return true;
      return (
        alert.title.toLowerCase().includes(query) ||
        alert.description.toLowerCase().includes(query) ||
        alert.entityId.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return right - left;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert center"
        description="Deadline alerts raised by the workflow sweep, scoped to your role and jurisdiction."
        actions={
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={runSweep}>
            Run deadline sweep
          </Button>
        }
      />

      <Notice icon={ShieldAlert}>
        Alerts flag deadlines for human review. They never approve, reject or alter an application.
        Every decision is recorded by an authorised officer.
      </Notice>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open" value={summary.open} icon={BellRing} />
        <StatTile label="Acknowledged" value={summary.acknowledged} icon={Check} />
        <StatTile label="Critical severity" value={summary.critical} icon={AlertTriangle} />
        <StatTile label="High severity" value={summary.high} icon={AlertTriangle} />
      </div>

      <section className="rounded-card border border-line bg-surface shadow-raise">
        <div className="space-y-3 border-b border-line p-4">
          <Tabs
            ariaLabel="Filter alerts by status"
            items={STATUS_TABS.map((tab) => ({
              id: tab.key,
              label: tab.label,
              count: statusCounts[tab.key]
            }))}
            value={statusFilter}
            onChange={(id) => setStatusFilter(id as StatusFilter)}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search alert or record ID"
                aria-label="Search alerts"
                className="pl-9"
              />
            </div>

            <Select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
              aria-label="Filter by severity"
            >
              <option value="All">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>

            <Select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value as EntityFilter)}
              aria-label="Filter by record type"
            >
              <option value="All">All record types</option>
              <option value="Application">Application</option>
              <option value="EVC">EVC visit</option>
              <option value="Undertaking">Undertaking</option>
              <option value="Document">Document</option>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title={scoped.length === 0 ? 'No deadline alerts raised' : 'No alerts match these filters'}
            description={
              scoped.length === 0
                ? 'The sweep runs every minute and raises alerts when a stage, report, undertaking or document passes its due date.'
                : 'Clear the search or choose a different status, severity or record type.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((alert) => (
              <li key={alert.id} className="p-4 transition-colors duration-150 hover:bg-surface-2/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={severityTone(alert.severity)} className="capitalize">
                        {alert.severity}
                      </Badge>
                      <Badge tone={statusTone(alert.status)}>{alert.status}</Badge>
                      <Badge>{alert.entityType}</Badge>
                      <span className="text-xs text-ink-2">{formatTimestamp(alert.createdAt)}</span>
                    </div>

                    <h3 className="mt-2 text-sm font-semibold leading-snug text-ink">{alert.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{alert.description}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-ink-2">
                        Record <span className="font-medium text-ink">{alert.entityId}</span>
                        {alert.region ? `, ${alert.region} Region` : ''}
                      </span>
                      {alert.link && (
                        <Link
                          to={alert.link}
                          className="rounded font-medium text-accent underline-offset-4 hover:text-accent-hover hover:underline"
                        >
                          Open record
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {alert.status === 'Open' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                    {alert.status !== 'Resolved' &&
                      (canResolve ? (
                        <Button
                          size="sm"
                          icon={<CheckCheck className="h-3.5 w-3.5" />}
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs text-ink-2"
                          title="Resolving an alert requires an officer role with review or verification authority."
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Officer action required
                        </span>
                      ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

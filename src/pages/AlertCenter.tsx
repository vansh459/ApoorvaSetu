import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
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

const SEVERITY_TONES: Record<SystemAlert['severity'], string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200'
};

const STATUS_TONES: Record<SystemAlert['status'], string> = {
  Open: 'bg-rose-50 text-rose-700 border-rose-200',
  Acknowledged: 'bg-amber-50 text-amber-700 border-amber-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alert center</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Deadline alerts raised by the workflow sweep, scoped to your role and jurisdiction.
          </p>
        </div>
        <button
          onClick={runSweep}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ${focusRing}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Run deadline sweep
        </button>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed text-blue-900">
          Alerts flag deadlines for human review. They never approve, reject or alter an
          application — every decision is recorded by an authorised officer.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: summary.open, tone: 'text-rose-600' },
          { label: 'Acknowledged', value: summary.acknowledged, tone: 'text-amber-600' },
          { label: 'Critical severity', value: summary.critical, tone: 'text-rose-700' },
          { label: 'High severity', value: summary.high, tone: 'text-orange-600' }
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs"
          >
            <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
            <div className={`text-xl font-bold tracking-tight mt-1 ${item.tone}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${focusRing} ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-[10px] font-bold ${
                      isActive ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {statusCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search alert or record ID"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors cursor-pointer"
              aria-label="Filter by severity"
            >
              <option value="All">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value as EntityFilter)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors cursor-pointer"
              aria-label="Filter by record type"
            >
              <option value="All">All record types</option>
              <option value="Application">Application</option>
              <option value="EVC">EVC visit</option>
              <option value="Undertaking">Undertaking</option>
              <option value="Document">Document</option>
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <BellRing className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {scoped.length === 0 ? 'No deadline alerts raised' : 'No alerts match these filters'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {scoped.length === 0
                ? 'The sweep runs every minute and raises alerts when a stage, report, undertaking or document passes its due date.'
                : 'Clear the search or choose a different status, severity or record type.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((alert) => (
              <li key={alert.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${SEVERITY_TONES[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_TONES[alert.status]}`}
                      >
                        {alert.status}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {alert.entityType}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTimestamp(alert.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 mt-2 leading-snug">
                      {alert.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
                      <span className="text-slate-500">
                        Record <span className="font-semibold text-slate-700">{alert.entityId}</span>
                      </span>
                      {alert.region && (
                        <span className="text-slate-500">{alert.region} Region</span>
                      )}
                      {alert.link && (
                        <Link
                          to={alert.link}
                          className={`inline-flex items-center gap-0.5 font-semibold text-blue-600 hover:text-blue-800 rounded ${focusRing}`}
                        >
                          Open record
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {alert.status === 'Open' && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors cursor-pointer ${focusRing}`}
                      >
                        <Check className="w-3 h-3" />
                        Acknowledge
                      </button>
                    )}
                    {alert.status !== 'Resolved' &&
                      (canResolve ? (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors cursor-pointer ${focusRing}`}
                        >
                          <CheckCheck className="w-3 h-3" />
                          Resolve
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-400"
                          title="Resolving an alert requires an officer role with review or verification authority."
                        >
                          <AlertTriangle className="w-3 h-3" />
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

import React, { useMemo, useState } from 'react';
import {
  Search,
  Download,
  X,
  RefreshCw,
  ShieldCheck,
  Link2,
  Database
} from 'lucide-react';
import { AuditLog } from '../../types';
import { filterAuditLogs, listAuditLogs } from '../../services/auditService';

const ENTITY_TYPES = [
  'Application',
  'User',
  'EVC',
  'Compliance',
  'Document',
  'System',
  'Auth',
  'Undertaking',
  'Alert',
  'Escalation'
] as const;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  AICTE_ADMIN: 'AICTE Central Admin',
  REGIONAL_OFFICER: 'Regional Officer',
  EVC_MEMBER: 'EVC Member',
  INSTITUTION_ADMIN: 'Institution Admin'
};

function renderDiff(value?: string): string {
  if (!value) return '—';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => listAuditLogs());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [correlationFilter, setCorrelationFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = useMemo(
    () =>
      filterAuditLogs(logs, {
        search,
        role: roleFilter,
        entityType: entityFilter,
        correlationId: correlationFilter
      }),
    [logs, search, roleFilter, entityFilter, correlationFilter]
  );

  const refresh = () => {
    setLogs(listAuditLogs());
  };

  const exportLogsAsCSV = () => {
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Role',
      'Action',
      'Event Type',
      'Entity Type',
      'Entity ID',
      'Details',
      'Previous State',
      'New State',
      'Correlation ID',
      'Source',
      'IP Address'
    ];
    const escape = (value?: string) => `"${(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((log) => [
      log.id,
      escape(log.timestamp),
      escape(log.userName),
      log.userRole,
      log.action,
      log.eventType ?? '',
      log.entityType,
      log.entityId,
      escape(log.details),
      escape(log.previousState),
      escape(log.newState),
      log.correlationId ?? '',
      log.source ?? 'ui',
      log.ipAddress
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `ApoorvaSetu_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Super Admin Security
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Append-only audit trail ({logs.length} entries)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Activity & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Every mutation is recorded with actor, before/after state and a correlation ID for
            reconstruction.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={refresh}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportLogsAsCSV}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Logs (CSV)</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, details, entity or correlation ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:bg-white focus:border-amber-400 focus:outline-hidden"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            aria-label="Filter by entity"
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All entities</option>
            {ENTITY_TYPES.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] text-slate-500">
          <div className="relative flex-1">
            <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={correlationFilter}
              onChange={(e) => setCorrelationFilter(e.target.value)}
              placeholder="Correlation ID (e.g. COR-...)"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] focus:bg-white focus:border-amber-400 focus:outline-hidden"
            />
          </div>
          <span>
            Showing <strong className="text-slate-700">{filteredLogs.length}</strong> of {logs.length}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action / event</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">Correlation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {ROLE_LABELS[log.userRole] ?? log.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono font-semibold text-blue-700 text-[11px]">{log.action}</div>
                    {log.eventType && (
                      <div className="text-[10px] text-slate-400 font-mono">{log.eventType}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                    <span className="font-medium">{log.entityType}</span>{' '}
                    <span className="text-slate-400 font-mono text-[10px]">{log.entityId}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-md truncate">{log.details}</td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                    {log.correlationId ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="py-12 text-center">
            <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No audit entries match these filters</p>
            <p className="text-xs text-slate-500 mt-1">
              Clear the filters or perform a workflow action to generate an immutable record.
            </p>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              aria-label="Close audit entry"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                {selectedLog.id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">{selectedLog.timestamp}</span>
              {selectedLog.source && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  source: {selectedLog.source}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1 font-mono">{selectedLog.action}</h3>
            <p className="text-xs text-slate-600 mb-4">{selectedLog.details}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Actor</span>
                  <span className="font-bold text-slate-800 text-right">{selectedLog.userName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-slate-700 text-right">{selectedLog.userId}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Role</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {ROLE_LABELS[selectedLog.userRole] ?? selectedLog.userRole}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">IP address</span>
                  <span className="font-mono text-slate-700 text-right">{selectedLog.ipAddress}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Entity</span>
                  <span className="font-bold text-blue-700 text-right">{selectedLog.entityType}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Entity ID</span>
                  <span className="font-mono text-slate-700 text-right">{selectedLog.entityId}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Event type</span>
                  <span className="font-mono text-slate-700 text-right">
                    {selectedLog.eventType ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Correlation</span>
                  <span className="font-mono text-slate-700 text-right break-all">
                    {selectedLog.correlationId ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Previous state</div>
                <pre className="text-[11px] text-slate-700 bg-rose-50/60 p-3 rounded-xl border border-rose-100 overflow-x-auto whitespace-pre-wrap break-words">
                  {renderDiff(selectedLog.previousState)}
                </pre>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">New state</div>
                <pre className="text-[11px] text-slate-700 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 overflow-x-auto whitespace-pre-wrap break-words">
                  {renderDiff(selectedLog.newState)}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audit records are append-only and cannot be edited.
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

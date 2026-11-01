import React, { useMemo, useState } from 'react';
import { Database, Download, Link2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { AuditLog } from '../../types';
import { filterAuditLogs, listAuditLogs } from '../../services/auditService';
import { ROLE_LABELS } from '../../services/rbacService';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Select,
  type DataTableColumn
} from '../../components/ui';

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

function renderDiff(value?: string): string {
  if (!value) return 'None';
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

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log) => (
        <span className="whitespace-nowrap text-xs text-ink-2">{log.timestamp}</span>
      )
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (log) => (
        <div className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap font-medium text-ink">{log.userName}</span>
          <Badge tone="neutral">{ROLE_LABELS[log.userRole] ?? log.userRole}</Badge>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <div className="min-w-0">
          <div className="font-medium text-ink">{log.action}</div>
          {log.eventType && (
            <div className="mt-0.5 font-mono text-xs text-ink-2">{log.eventType}</div>
          )}
        </div>
      )
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (log) => (
        <div className="min-w-0">
          <div className="text-ink">{log.entityType}</div>
          <div className="mt-0.5 font-mono text-xs text-ink-2">{log.entityId}</div>
        </div>
      )
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => (
        <div className="max-w-[26rem] truncate text-ink-2" title={log.details}>
          {log.details}
        </div>
      )
    },
    {
      key: 'correlation',
      header: 'Correlation',
      render: (log) => (
        <span className="whitespace-nowrap font-mono text-xs text-ink-2">
          {log.correlationId ?? 'None'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit trail"
        description="Every mutation is recorded with the actor, the before and after state and a correlation ID so any decision can be reconstructed."
        meta={
          <>
            <Badge tone="info">Super admin console</Badge>
            <span className="text-xs text-ink-2">{logs.length} entries</span>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={refresh}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button onClick={exportLogsAsCSV} icon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Search" htmlFor="audit-search">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                aria-hidden="true"
              />
              <Input
                id="audit-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Actor, action or entity"
                className="pl-9"
              />
            </div>
          </Field>

          <Field label="Role" htmlFor="audit-role">
            <Select
              id="audit-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Entity" htmlFor="audit-entity">
            <Select
              id="audit-entity"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="ALL">All entities</option>
              {ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Correlation ID"
            htmlFor="audit-correlation"
            hint={`Showing ${filteredLogs.length} of ${logs.length} entries`}
          >
            <div className="relative">
              <Link2
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                aria-hidden="true"
              />
              <Input
                id="audit-correlation"
                value={correlationFilter}
                onChange={(e) => setCorrelationFilter(e.target.value)}
                placeholder="e.g. COR-"
                className="pl-9 font-mono text-xs"
              />
            </div>
          </Field>
        </div>
      </Card>

      <DataTable
        caption="Audit trail entries"
        columns={columns}
        rows={filteredLogs}
        rowKey={(log) => log.id}
        onRowClick={(log) => setSelectedLog(log)}
        minWidth="980px"
        empty={
          <EmptyState
            icon={Database}
            title="No audit entries match these filters"
            description="Clear the filters or perform a workflow action to record a new entry."
          />
        }
      />

      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.action ?? 'Audit entry'}
        subtitle={selectedLog ? `${selectedLog.timestamp}, ${selectedLog.userName}` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" className="font-mono">
                {selectedLog.id}
              </Badge>
              <Badge tone="info">{ROLE_LABELS[selectedLog.userRole] ?? selectedLog.userRole}</Badge>
              {selectedLog.source && <Badge tone="neutral">Source: {selectedLog.source}</Badge>}
            </div>

            <p className="text-sm text-ink-2">{selectedLog.details}</p>

            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-ink-2">Actor</dt>
                <dd className="text-right text-sm font-medium text-ink">{selectedLog.userName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-ink-2">Entity</dt>
                <dd className="text-right text-sm font-medium text-ink">
                  {selectedLog.entityType}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-ink-2">User ID</dt>
                <dd className="break-all text-right font-mono text-xs text-ink">
                  {selectedLog.userId}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-ink-2">Entity ID</dt>
                <dd className="break-all text-right font-mono text-xs text-ink">
                  {selectedLog.entityId}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-ink-2">IP address</dt>
                <dd className="text-right font-mono text-xs text-ink">{selectedLog.ipAddress}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-ink-2">Event type</dt>
                <dd className="text-right font-mono text-xs text-ink">
                  {selectedLog.eventType ?? 'None'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:col-span-2">
                <dt className="shrink-0 text-sm text-ink-2">Correlation</dt>
                <dd className="break-all text-right font-mono text-xs text-ink">
                  {selectedLog.correlationId ?? 'None'}
                </dd>
              </div>
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-2">Previous state</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-control bg-surface-2 p-3 font-mono text-xs text-ink">
                  {renderDiff(selectedLog.previousState)}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-2">New state</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-control bg-surface-2 p-3 font-mono text-xs text-ink">
                  {renderDiff(selectedLog.newState)}
                </pre>
              </div>
            </div>

            <Notice tone="neutral" icon={ShieldCheck}>
              Audit records are append-only and cannot be edited or deleted.
            </Notice>
          </div>
        )}
      </Modal>
    </div>
  );
};

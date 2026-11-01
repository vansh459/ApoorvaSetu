import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileBarChart,
  FileCheck2,
  ShieldCheck,
  MapPin,
  Table2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  filterApplicationsForUser,
  filterDocumentsForUser,
  filterEVCVisitsForUser,
  filterUndertakingsForUser
} from '../services/rbacService';
import { authService } from '../services/authService';
import { resolveWorkflowConfig } from '../workflow/config';
import {
  REPORT_CATALOG,
  buildReport,
  reportFilename
} from '../workflow/reports';
import type { ReportKind, ReportRow, ReportTable } from '../workflow/reports';
import { REGION_ORDER, evcQueueSummary, pipelineMetrics } from '../workflow/selectors';
import { summariseUndertakings } from '../workflow/undertakings';
import { summariseDocuments } from '../workflow/documents';
import { buildCsv, downloadCsv } from '../utils/csv';
import { formatDisplayDate, getNow } from '../utils/dates';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Select,
  StatTile
} from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import type { Region } from '../types';

const REPORT_ICONS: Record<ReportKind, typeof FileBarChart> = {
  pendency: Table2,
  evc: CalendarDays,
  undertakings: ShieldCheck,
  documents: FileCheck2,
  overdue: AlertTriangle,
  regions: MapPin
};

export const Reports: React.FC = () => {
  const { applications, evcVisits, undertakings, documents, showToast } = useApp();
  const { user } = useAuth();

  const [regionFilter, setRegionFilter] = useState<string>(() =>
    user?.role === 'REGIONAL_OFFICER' ? user.region ?? 'All' : 'All'
  );
  const [selectedKind, setSelectedKind] = useState<ReportKind>('pendency');

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = useMemo(() => getNow(), []);

  const scopedApps = useMemo(() => filterApplicationsForUser(applications, user), [applications, user]);
  const scopedVisits = useMemo(() => filterEVCVisitsForUser(evcVisits, user), [evcVisits, user]);
  const scopedUndertakings = useMemo(
    () => filterUndertakingsForUser(undertakings, user),
    [undertakings, user]
  );
  const scopedDocuments = useMemo(() => filterDocumentsForUser(documents, user), [documents, user]);

  const regionOptions: Region[] =
    user?.role === 'REGIONAL_OFFICER' && user.region
      ? [user.region]
      : user?.role === 'INSTITUTION_ADMIN' && user.region
        ? [user.region]
        : REGION_ORDER;

  const regionLocked = user?.role === 'REGIONAL_OFFICER' || user?.role === 'INSTITUTION_ADMIN';
  const matchesRegion = (region: Region) => regionFilter === 'All' || region === regionFilter;

  const apps = scopedApps.filter((app) => matchesRegion(app.region));
  const visits = scopedVisits.filter((visit) => matchesRegion(visit.region));
  const appUndertakings = scopedUndertakings.filter((item) => matchesRegion(item.region));
  const appDocuments = scopedDocuments.filter((item) => matchesRegion(item.region));

  const tables = useMemo(() => {
    const context = {
      applications: apps,
      visits,
      undertakings: appUndertakings,
      documents: appDocuments,
      config,
      now
    };
    return REPORT_CATALOG.reduce(
      (accumulator, definition) => {
        accumulator[definition.kind] = buildReport(definition.kind, context);
        return accumulator;
      },
      {} as Record<ReportKind, ReportTable>
    );
  }, [apps, visits, appUndertakings, appDocuments, config, now]);

  const metrics = pipelineMetrics(apps, config, now);
  const visitSummary = evcQueueSummary(visits, config, now);
  const undertakingSummary = summariseUndertakings(appUndertakings, config, now);
  const documentSummary = summariseDocuments(appDocuments, config.documentWarningDays, now);

  const selectedDefinition =
    REPORT_CATALOG.find((definition) => definition.kind === selectedKind) ?? REPORT_CATALOG[0];
  const selectedTable = tables[selectedDefinition.kind];
  const previewRows = selectedTable.rows.slice(0, 10);

  const handleExport = () => {
    const csv = buildCsv(selectedTable.columns, selectedTable.rows);
    const filename = reportFilename(selectedDefinition, regionFilter, now);
    downloadCsv(filename, csv);
    showToast(`${selectedDefinition.title} exported as ${filename}`, 'success');
  };

  const columns: DataTableColumn<ReportRow>[] = selectedTable.columns.map((column) => ({
    key: column.key,
    header: column.label,
    render: (row) => {
      const value = row[column.key];
      return (
        <span className="block max-w-[240px] truncate">
          {value === '' || value === null ? '—' : String(value)}
        </span>
      );
    }
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports and evidence"
        description="Six reports built from the live workflow data. Every export uses the same filters and the same role scope as this screen."
        meta={
          <Badge>
            {regionFilter === 'All' ? 'All regions' : `${regionFilter} Region`},{' '}
            {formatDisplayDate(now)}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Active applications" value={metrics.pending} icon={FileBarChart} />
        <StatTile label="SLA breached" value={metrics.breached} icon={AlertTriangle} />
        <StatTile label="EVC reports overdue" value={visitSummary.reportOverdue} icon={CalendarDays} />
        <StatTile label="Undertakings overdue" value={undertakingSummary.overdue} icon={ShieldCheck} />
        <StatTile label="Documents expired" value={documentSummary.expired} icon={FileCheck2} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Regional filter" htmlFor="report-region" className="sm:w-64">
            <Select
              id="report-region"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
              disabled={regionLocked}
            >
              {!regionLocked && <option value="All">All regions</option>}
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region} Region
                </option>
              ))}
            </Select>
          </Field>
          <p className="pb-2 text-xs text-ink-2 sm:ml-auto">
            Applies to all six reports and to the downloadable CSV.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_CATALOG.map((definition) => {
          const Icon = REPORT_ICONS[definition.kind];
          const isSelected = definition.kind === selectedKind;
          return (
            <button
              key={definition.kind}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedKind(definition.kind)}
              className={`rounded-card border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-swift active:scale-[0.99] ${
                isSelected
                  ? 'border-accent bg-accent-soft shadow-raise'
                  : 'border-line bg-surface shadow-raise hover:border-line-strong hover:bg-surface-2'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-control ${
                    isSelected ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs text-ink-2">
                  {tables[definition.kind].rows.length}{' '}
                  {tables[definition.kind].rows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-ink">{definition.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{definition.description}</p>
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">{selectedDefinition.title}</h2>
            <p className="mt-0.5 text-xs text-ink-2">
              {selectedTable.rows.length} {selectedTable.rows.length === 1 ? 'row' : 'rows'}
              {selectedTable.rows.length > 10 ? ', preview shows the first 10' : ''}
            </p>
          </div>
          <Button
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={selectedTable.rows.length === 0}
          >
            Download CSV
          </Button>
        </div>

        <DataTable
          caption={`${selectedDefinition.title} preview`}
          columns={columns}
          rows={previewRows}
          rowKey={(row) => JSON.stringify(row)}
          minWidth="640px"
          empty={
            <EmptyState
              title="No rows for this selection"
              description="Change the regional filter or choose another report."
            />
          }
        />
      </section>
    </div>
  );
};

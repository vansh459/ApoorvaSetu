import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileBarChart,
  FileCheck2,
  FolderArchive,
  MapPin,
  ShieldCheck,
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
import type { ReportKind, ReportTable } from '../workflow/reports';
import { REGION_ORDER, evcQueueSummary, pipelineMetrics } from '../workflow/selectors';
import { summariseUndertakings } from '../workflow/undertakings';
import { summariseDocuments } from '../workflow/documents';
import { buildCsv, downloadCsv } from '../utils/csv';
import { formatDisplayDate, getNow } from '../utils/dates';
import type { Region } from '../types';

const REPORT_ICONS: Record<ReportKind, typeof FileBarChart> = {
  pendency: Table2,
  evc: CalendarDays,
  undertakings: ShieldCheck,
  documents: FileCheck2,
  overdue: AlertTriangle,
  regions: MapPin
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

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

  const handleExport = () => {
    const csv = buildCsv(selectedTable.columns, selectedTable.rows);
    const filename = reportFilename(selectedDefinition, regionFilter, now);
    downloadCsv(filename, csv);
    showToast(`${selectedDefinition.title} exported as ${filename}`, 'success');
  };

  const kpis = [
    { label: 'Active applications', value: metrics.pending },
    { label: 'SLA breached', value: metrics.breached },
    { label: 'EVC reports overdue', value: visitSummary.reportOverdue },
    { label: 'Undertakings overdue', value: undertakingSummary.overdue },
    { label: 'Documents expired', value: documentSummary.expired }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reports and evidence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Six reports built from the live workflow data. Every export uses the same filters and
            the same role scope as this screen.
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0">
          {regionFilter === 'All' ? 'All regions' : `${regionFilter} Region`} · {formatDisplayDate(now)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs"
          >
            <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
            <div className="text-xl font-bold tracking-tight text-slate-900 mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 sm:w-40" htmlFor="report-region">
            Regional filter
          </label>
          <select
            id="report-region"
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
            disabled={regionLocked}
            className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {!regionLocked && <option value="All">All regions</option>}
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region} Region
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 sm:ml-auto">
            Applies to all six reports and to the downloadable CSV.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {REPORT_CATALOG.map((definition) => {
          const Icon = REPORT_ICONS[definition.kind];
          const isSelected = definition.kind === selectedKind;
          return (
            <button
              key={definition.kind}
              onClick={() => setSelectedKind(definition.kind)}
              className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${focusRing} ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {tables[definition.kind].rows.length}{' '}
                  {tables[definition.kind].rows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-800 mt-3">{definition.title}</h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {definition.description}
              </p>
            </button>
          );
        })}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">{selectedDefinition.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedTable.rows.length}{' '}
              {selectedTable.rows.length === 1 ? 'row' : 'rows'}
              {selectedTable.rows.length > 10 ? ' · preview shows the first 10' : ''}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={selectedTable.rows.length === 0}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`}
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>

        {selectedTable.rows.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <FolderArchive className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No rows for this selection</p>
            <p className="text-xs text-slate-500 mt-1">
              Change the regional filter or choose another report.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  {selectedTable.columns.map((column) => (
                    <th key={column.key} className="py-2.5 px-3 whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedTable.rows.slice(0, 10).map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                    {selectedTable.columns.map((column) => (
                      <td
                        key={column.key}
                        className="py-2.5 px-3 text-slate-600 whitespace-nowrap max-w-[240px] truncate"
                      >
                        {row[column.key] === '' || row[column.key] === null
                          ? '—'
                          : String(row[column.key])}
                      </td>
                    ))}
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

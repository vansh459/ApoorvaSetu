import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  filterApplicationsForUser,
  filterDocumentsForUser,
  filterEVCVisitsForUser,
  filterUndertakingsForUser
} from '../../services/rbacService';
import { authService } from '../../services/authService';
import { resolveWorkflowConfig } from '../../workflow/config';
import {
  REPORT_CATALOG,
  buildReport,
  reportFilename
} from '../../workflow/reports';
import type { ReportKind } from '../../workflow/reports';
import { REGION_ORDER } from '../../workflow/selectors';
import { buildCsv, downloadCsv } from '../../utils/csv';
import { getNow } from '../../utils/dates';
import type { Region } from '../../types';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export const GenerateReportModal: React.FC = () => {
  const { activeModal, setActiveModal, applications, evcVisits, undertakings, documents, showToast } =
    useApp();
  const { user } = useAuth();

  const [reportKind, setReportKind] = useState<ReportKind>('pendency');
  const [regionFilter, setRegionFilter] = useState<string>(() =>
    user?.role === 'REGIONAL_OFFICER' || user?.role === 'INSTITUTION_ADMIN'
      ? user.region ?? 'All'
      : 'All'
  );

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = useMemo(() => getNow(), [activeModal]);

  const regionLocked = user?.role === 'REGIONAL_OFFICER' || user?.role === 'INSTITUTION_ADMIN';
  const regionOptions: Region[] = regionLocked && user?.region ? [user.region] : REGION_ORDER;

  const table = useMemo(() => {
    const matchesRegion = (region: Region) => regionFilter === 'All' || region === regionFilter;
    return buildReport(reportKind, {
      applications: filterApplicationsForUser(applications, user).filter((app) =>
        matchesRegion(app.region)
      ),
      visits: filterEVCVisitsForUser(evcVisits, user).filter((visit) => matchesRegion(visit.region)),
      undertakings: filterUndertakingsForUser(undertakings, user).filter((item) =>
        matchesRegion(item.region)
      ),
      documents: filterDocumentsForUser(documents, user).filter((item) =>
        matchesRegion(item.region)
      ),
      config,
      now
    });
  }, [reportKind, regionFilter, applications, evcVisits, undertakings, documents, user, config, now]);

  const definition = REPORT_CATALOG.find((item) => item.kind === reportKind) ?? REPORT_CATALOG[0];

  const handleDownload = () => {
    const csv = buildCsv(table.columns, table.rows);
    const filename = reportFilename(definition, regionFilter, now);
    downloadCsv(filename, csv);
    setActiveModal(null);
    showToast(`${definition.title} exported as ${filename}`, 'success');
  };

  return (
    <Modal
      isOpen={activeModal === 'generate-report'}
      onClose={() => setActiveModal(null)}
      title="Export an official report"
      subtitle="CSV generated from the same live data and filters as the reports screen"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="modal-report">
            Report
          </label>
          <select
            id="modal-report"
            value={reportKind}
            onChange={(event) => setReportKind(event.target.value as ReportKind)}
            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-colors cursor-pointer ${focusRing}`}
          >
            {REPORT_CATALOG.map((item) => (
              <option key={item.kind} value={item.kind}>
                {item.title}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">{definition.description}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="modal-region">
            Regional filter
          </label>
          <select
            id="modal-region"
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
            disabled={regionLocked}
            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer ${focusRing}`}
          >
            {!regionLocked && <option value="All">All regions</option>}
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region} Region
              </option>
            ))}
          </select>
        </div>

        <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start space-x-3 text-xs text-blue-900">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {table.rows.length} {table.rows.length === 1 ? 'row' : 'rows'} ready for export
            </p>
            <p className="text-[11px] text-blue-800/80 mt-0.5">
              CSV with a UTF-8 byte-order mark so Excel opens regional names correctly.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={table.rows.length === 0}
            className={`flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${focusRing}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

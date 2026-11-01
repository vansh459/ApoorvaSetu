import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button, Field, Notice, Select } from '../ui';
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
      footer={
        <>
          <Button variant="secondary" onClick={() => setActiveModal(null)}>
            Cancel
          </Button>
          <Button
            icon={<Download className="h-4 w-4" strokeWidth={1.75} />}
            onClick={handleDownload}
            disabled={table.rows.length === 0}
          >
            Download CSV
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Report" htmlFor="modal-report" hint={definition.description}>
          <Select
            id="modal-report"
            value={reportKind}
            onChange={(event) => setReportKind(event.target.value as ReportKind)}
          >
            {REPORT_CATALOG.map((item) => (
              <option key={item.kind} value={item.kind}>
                {item.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Regional filter" htmlFor="modal-region">
          <Select
            id="modal-region"
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

        <Notice
          tone="info"
          icon={FileSpreadsheet}
          title={`${table.rows.length} ${table.rows.length === 1 ? 'row' : 'rows'} ready for export`}
        >
          CSV with a UTF-8 byte-order mark so Excel opens regional names correctly.
        </Notice>
      </div>
    </Modal>
  );
};

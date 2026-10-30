import React, { useState } from 'react';
import { Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

export const GenerateReportModal: React.FC = () => {
  const { activeModal, setActiveModal, applications, showToast } = useApp();

  const [reportType, setReportType] = useState('applications');
  const [regionFilter, setRegionFilter] = useState('All');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);

    setTimeout(() => {
      let csvContent = '';
      let filename = `AICTE_Approval_Report_${new Date().toISOString().split('T')[0]}.csv`;

      if (reportType === 'applications') {
        csvContent = 'Application ID,Institute Name,Stage,Region,Status,Intake,Applied Date,Last Updated\n';
        applications.forEach((a) => {
          if (regionFilter === 'All' || a.region === regionFilter) {
            csvContent += `"${a.id}","${a.instituteName}","${a.stage}","${a.region}","${a.status}",${a.intakeProposed},"${a.appliedDate}","${a.lastUpdated}"\n`;
          }
        });
      } else if (reportType === 'compliance') {
        csvContent = 'Category,Count,Status,Priority\n';
        csvContent += '"Lease Documents (expiring < 3 months)",126,"Pending Review","High"\n';
        csvContent += '"Other Institutional Undertakings",243,"Action Required","High"\n';
        csvContent += '"Compliance Submissions (pending)",389,"Pending Verification","Medium"\n';
        csvContent += '"Documents Expired",67,"Expired Notice Issued","Critical"\n';
        csvContent += '"Documents Valid",4957,"Valid","Normal"\n';
      } else {
        csvContent = 'Region,Total Applications,Approved,Pending,Requiring Action\n';
        csvContent += '"Northern",1248,680,480,88\n';
        csvContent += '"Southern",1102,620,410,72\n';
        csvContent += '"Eastern",934,510,360,64\n';
        csvContent += '"Western",872,480,330,62\n';
        csvContent += '"Central",648,360,240,48\n';
        csvContent += '"North Eastern",391,210,150,31\n';
        csvContent += '"Others",287,101,164,22\n';
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloading(false);
      setActiveModal(null);
      showToast(`Report "${filename}" exported successfully!`, 'success');
    }, 600);
  };

  return (
    <Modal
      isOpen={activeModal === 'generate-report'}
      onClose={() => setActiveModal(null)}
      title="Generate Official AICTE Approval Report"
      subtitle="Export consolidated data and compliance audits for records"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Report Data Domain
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
          >
            <option value="applications">Applications Master Dossier (Full Data)</option>
            <option value="compliance">Compliance & Validity Audit Deficiencies</option>
            <option value="regional">Regional Clearance & Pendency Summary</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Regional Office Filter
          </label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
          >
            <option value="All">All Regions (National Consolidated)</option>
            <option value="Northern">Northern Region</option>
            <option value="Southern">Southern Region</option>
            <option value="Eastern">Eastern Region</option>
            <option value="Western">Western Region</option>
            <option value="Central">Central Region</option>
            <option value="North Eastern">North Eastern Region</option>
          </select>
        </div>

        <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start space-x-3 text-xs text-blue-900">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Format: Standard CSV / Excel Ready</p>
            <p className="text-[11px] text-blue-800/80 mt-0.5">
              Exports clean tabular records compliant with AICTE central reporting format.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
          >
            {downloading ? (
              <span>Preparing File...</span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export & Download CSV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

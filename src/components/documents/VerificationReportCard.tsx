import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  ListChecks,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import type {
  DocumentChecklistRow,
  DocumentExtractionFields,
  DocumentVerificationIssue,
  DocumentVerificationReport
} from '../../types';

const FIELD_LABELS: Record<keyof DocumentExtractionFields, string> = {
  institutionName: 'Institution name',
  documentType: 'Document type',
  registrationNumber: 'Registration number',
  issueDate: 'Issue date',
  expiryDate: 'Expiry date',
  issuingAuthority: 'Issuing authority'
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-rose-50 text-rose-700 border-rose-200'
};

const CHECKLIST_STYLE: Record<DocumentChecklistRow['status'], string> = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pending Verification': 'bg-blue-50 text-blue-700 border-blue-200',
  Missing: 'bg-slate-100 text-slate-600 border-slate-200',
  Expired: 'bg-rose-50 text-rose-700 border-rose-200',
  Rejected: 'bg-amber-50 text-amber-700 border-amber-200'
};

const SEVERITY_STYLE: Record<DocumentVerificationIssue['severity'], string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200'
};

const STATUS_STYLE: Record<DocumentVerificationReport['status'], string> = {
  'Pending Review': 'bg-blue-50 text-blue-700 border-blue-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

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

interface VerificationReportCardProps {
  report: DocumentVerificationReport;
  canReview: boolean;
  onAccept: (id: string, note: string) => boolean;
  onReject: (id: string, note: string) => boolean;
}

export const VerificationReportCard: React.FC<VerificationReportCardProps> = ({
  report,
  canReview,
  onAccept,
  onReject
}) => {
  const [note, setNote] = useState('');

  const critical = report.issues.filter((issue) => issue.severity === 'critical').length;
  const warnings = report.issues.filter((issue) => issue.severity === 'warning').length;
  const present = report.checklist.filter((row) => row.status === 'Present').length;
  const missing = report.checklist.filter((row) => row.status === 'Missing').length;
  const expired = report.checklist.filter((row) => row.status === 'Expired').length;

  const handleAccept = () => {
    if (onAccept(report.id, note)) setNote('');
  };

  const handleReject = () => {
    if (onReject(report.id, note)) setNote('');
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      <header className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{report.fileName}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {report.instituteName} · {report.documentTypeCode.replace(/_/g, ' ')} ·{' '}
              {formatTimestamp(report.createdAt)}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 self-start px-2.5 py-1 rounded-full border text-[11px] font-bold ${STATUS_STYLE[report.status]}`}
        >
          {report.status === 'Accepted' ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : report.status === 'Rejected' ? (
            <XCircle className="w-3.5 h-3.5" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          {report.status}
        </span>
      </header>

      <div className="p-5 space-y-5">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <div className="flex items-center gap-2 text-indigo-800">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <p className="text-[11px] font-bold uppercase tracking-wider">AI-assisted advisory</p>
          </div>
          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
            {report.aiSummary?.text ?? 'No advisory summary was generated.'}
          </p>
          <p className="text-[11px] text-indigo-700/80 mt-2 leading-relaxed">{report.disclaimer}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Critical', value: critical, tone: critical > 0 ? 'text-rose-700' : 'text-slate-700' },
            { label: 'Warnings', value: warnings, tone: warnings > 0 ? 'text-amber-700' : 'text-slate-700' },
            { label: 'Checklist present', value: `${present}/${report.checklist.length}`, tone: 'text-emerald-700' },
            { label: 'Missing / expired', value: `${missing} / ${expired}`, tone: missing + expired > 0 ? 'text-rose-700' : 'text-slate-700' }
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className={`text-base font-bold mt-0.5 ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Extracted information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(Object.keys(FIELD_LABELS) as (keyof DocumentExtractionFields)[]).map((key) => {
              const field = report.extraction.fields[key];
              return (
                <div key={key} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {FIELD_LABELS[key]}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${CONFIDENCE_STYLE[field.confidence]}`}>
                      {field.confidence}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${field.value ? 'text-slate-900 font-medium' : 'text-slate-400 italic'}`}>
                    {field.value ?? 'Not identified'}
                  </p>
                  {field.evidence ? (
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2" title={field.evidence}>
                      Evidence: {field.evidence}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Extraction method: {report.extraction.method.toUpperCase()} · {report.extraction.pageCount} page(s)
          </p>
        </section>

        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Findings ({report.issues.length})
          </h4>
          {report.issues.length === 0 ? (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              No findings were raised for this upload.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {report.issues.map((issue, index) => (
                <li
                  key={`${issue.code}-${issue.field ?? 'general'}-${index}`}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${SEVERITY_STYLE[issue.severity]}`}
                >
                  {issue.severity === 'critical' ? (
                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  )}
                  <span className="flex-1">{issue.message}</span>
                  <span className="font-mono text-[9px] opacity-70 mt-0.5 shrink-0">{issue.code}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            <ListChecks className="w-3.5 h-3.5 text-slate-500" />
            Required document checklist
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Requirement</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.checklist.map((row) => (
                  <tr key={row.code}>
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${CHECKLIST_STYLE[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] font-mono text-slate-500">
                      {row.evidenceDocumentIds.length === 0
                        ? '—'
                        : row.evidenceDocumentIds.includes('CURRENT_UPLOAD')
                          ? 'This upload'
                          : row.evidenceDocumentIds.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {report.extraction.warnings.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Extraction warnings</p>
            <ul className="mt-1 space-y-1">
              {report.extraction.warnings.map((warning) => (
                <li key={warning} className="text-[11px] text-slate-600">
                  {warning}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="border-t border-slate-100 pt-4">
          {report.status === 'Pending Review' ? (
            canReview ? (
              <div className="space-y-2">
                <label htmlFor={`verification-note-${report.id}`} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Officer review note
                </label>
                <textarea
                  id={`verification-note-${report.id}`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  placeholder="Record what you confirmed or why the findings are rejected (required to reject findings)."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accept findings
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject findings
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Reviewing findings records an audit entry only. It does not approve, reject, or move the application.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Awaiting officer review. Use these findings to correct the dossier before resubmission.
              </p>
            )
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Officer decision</p>
              <p className="text-xs text-slate-800 mt-1">
                {report.decision?.outcome} by {report.decision?.by} on{' '}
                {report.decision ? formatTimestamp(report.decision.at) : '—'}
              </p>
              {report.decision?.note ? (
                <p className="text-[11px] text-slate-600 mt-1">{report.decision.note}</p>
              ) : null}
              <p className="text-[10px] text-slate-400 mt-1.5">
                This decision applies to the verification findings only and does not change the statutory application decision.
              </p>
            </div>
          )}
        </footer>
      </div>
    </article>
  );
};

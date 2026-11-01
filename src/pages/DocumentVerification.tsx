import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileSearch,
  FileText,
  ListChecks,
  Loader2,
  ScanLine,
  ShieldCheck,
  UploadCloud,
  XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  filterApplicationsForUser,
  filterDocumentVerificationsForUser,
  hasPermission
} from '../services/rbacService';
import { authService } from '../services/authService';
import {
  MAX_VERIFICATION_FILE_MB,
  requestDocumentVerification,
  validateVerificationFile
} from '../services/documentVerificationService';
import { VerificationReportCard } from '../components/documents/VerificationReportCard';
import { DOCUMENT_TYPES, getDocumentType } from '../workflow/documents';
import {
  compareChecklist,
  requiredChecklistForApplication
} from '../workflow/documentVerification';
import { resolveWorkflowConfig } from '../workflow/config';
import { formatDisplayDate, getNow } from '../utils/dates';
import type { DocumentChecklistRow, DocumentVerificationReport } from '../types';

type HistoryFilter = 'All' | DocumentVerificationReport['status'];

const HISTORY_FILTERS: HistoryFilter[] = ['All', 'Pending Review', 'Accepted', 'Rejected'];

const CHECKLIST_STYLE: Record<DocumentChecklistRow['status'], string> = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pending Verification': 'bg-blue-50 text-blue-700 border-blue-200',
  Missing: 'bg-slate-100 text-slate-600 border-slate-200',
  Expired: 'bg-rose-50 text-rose-700 border-rose-200',
  Rejected: 'bg-amber-50 text-amber-700 border-amber-200'
};

export const DocumentVerification: React.FC = () => {
  const {
    applications,
    documents,
    documentVerifications,
    runDocumentVerification,
    acceptDocumentVerification,
    rejectDocumentVerification,
    showToast
  } = useApp();
  const { user } = useAuth();

  const config = useMemo(() => resolveWorkflowConfig(authService.getSystemConfig()), []);
  const canReview = hasPermission(user, 'documents.verify');

  const scopedApplications = useMemo(
    () => filterApplicationsForUser(applications, user),
    [applications, user]
  );

  const [applicationId, setApplicationId] = useState('');
  const [documentTypeCode, setDocumentTypeCode] = useState('AICTE_APPROVAL_LETTER');
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('All');

  const selectedApplication =
    scopedApplications.find((application) => application.id === applicationId) ?? scopedApplications[0];

  const scopedReports = useMemo(
    () => filterDocumentVerificationsForUser(documentVerifications, user),
    [documentVerifications, user]
  );

  const sortedReports = useMemo(
    () =>
      [...scopedReports].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [scopedReports]
  );

  const filteredReports = useMemo(
    () =>
      historyFilter === 'All'
        ? sortedReports
        : sortedReports.filter((report) => report.status === historyFilter),
    [historyFilter, sortedReports]
  );

  const checklistPreview = useMemo(() => {
    if (!selectedApplication) return [];
    return compareChecklist({
      application: selectedApplication,
      documents,
      documentTypeCode,
      warningDays: config.documentWarningDays,
      now: getNow()
    });
  }, [selectedApplication, documents, documentTypeCode, config.documentWarningDays]);

  const requiredCount = selectedApplication
    ? requiredChecklistForApplication(selectedApplication).length
    : 0;

  const handleRun = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setErrorCode(null);

    if (!selectedApplication) {
      setError('No application is available in your scope. Ask an administrator to assign one.');
      return;
    }

    const fileError = validateVerificationFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    setIsRunning(true);
    const response = await requestDocumentVerification({
      file: file as File,
      applicationId: selectedApplication.id,
      documentTypeCode
    });

    if (!response.ok) {
      setIsRunning(false);
      setError(response.message);
      setErrorCode(response.code);
      showToast(response.message, 'error');
      return;
    }

    const stored = runDocumentVerification({
      applicationId: selectedApplication.id,
      documentTypeCode,
      fileName: response.fileName,
      fileType: 'application/pdf',
      fileSize: response.fileSize,
      fileHash: response.fileHash,
      extraction: response.extraction,
      advisory: response.advisory
    });

    setIsRunning(false);

    if (!stored.ok) {
      setError(stored.message ?? 'The verification report could not be stored.');
      return;
    }

    setFile(null);
    setInputKey((value) => value + 1);
  };

  const pendingCount = scopedReports.filter((report) => report.status === 'Pending Review').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Document Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Extract approval-document details, flag missing or expired evidence, and route findings to an officer.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold">
          <ScanLine className="w-4 h-4" />
          {pendingCount} report(s) awaiting review
        </span>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Advisory only.</strong> AI-assisted checks never approve or reject an application and
          never change the workflow stage. Final statutory decisions remain with the competent AICTE authority.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form
          onSubmit={handleRun}
          className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Run a verification check</h2>
              <p className="text-[11px] text-slate-500">
                PDF only · up to {MAX_VERIFICATION_FILE_MB} MB · extracted with PyMuPDF and Tesseract OCR
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="verification-application" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Application
              </label>
              <select
                id="verification-application"
                value={selectedApplication?.id ?? ''}
                onChange={(event) => setApplicationId(event.target.value)}
                disabled={scopedApplications.length === 0}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              >
                {scopedApplications.length === 0 ? (
                  <option value="">No applications in your scope</option>
                ) : (
                  scopedApplications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.id} — {application.instituteName}
                    </option>
                  ))
                )}
              </select>
              {selectedApplication ? (
                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedApplication.type} · {selectedApplication.region} Region · applied{' '}
                  {formatDisplayDate(selectedApplication.appliedDate)}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="verification-document-type" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Document type
              </label>
              <select
                id="verification-document-type"
                value={documentTypeCode}
                onChange={(event) => setDocumentTypeCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">
                Validity window: {getDocumentType(documentTypeCode)?.validityMonths ?? 12} month(s)
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="verification-file" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              PDF document
            </label>
            <input
              key={inputKey}
              id="verification-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
                setErrorCode(null);
              }}
              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-slate-800 file:cursor-pointer cursor-pointer"
            />
            {file ? (
              <p className="mt-1.5 text-[11px] text-slate-500">
                {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">
                Upload the signed approval, NOC, affiliation, financial or land document to verify.
              </p>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
              {errorCode === 'EXTRACTOR_UNAVAILABLE' ? (
                <p className="text-[11px] text-rose-700 mt-1.5 font-mono break-all">
                  Start the extractor: docker compose up doc-verifier · or cd services/doc-verifier &amp;&amp; uvicorn main:app --port 8090
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isRunning || !selectedApplication}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              {isRunning ? 'Extracting and checking…' : 'Run AI-assisted check'}
            </button>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Officer review required after extraction
            </span>
          </div>
        </form>

        <aside className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Required checklist</h2>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            {selectedApplication
              ? `${requiredCount} mandatory document(s) for this workflow route.`
              : 'Select an application to see its required documents.'}
          </p>

          {checklistPreview.length > 0 ? (
            <ul className="space-y-1.5">
              {checklistPreview.map((row) => (
                <li
                  key={row.code}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-2.5 py-2"
                >
                  <span className="text-[11px] text-slate-700 leading-snug">{row.label}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${CHECKLIST_STYLE[row.status]}`}>
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center">
              <Building2 className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
              <p className="text-[11px] text-slate-400">No application selected.</p>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">What the check reads</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Institution name, document type, registration details, issue date, expiry date and issuing
              authority. Unreadable or missing values are reported for human confirmation.
            </p>
          </div>
        </aside>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Verification reports</h2>
            <p className="text-[11px] text-slate-500">
              Advisory findings, evidence comparison and officer decisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HISTORY_FILTERS.map((filter) => {
              const count =
                filter === 'All'
                  ? sortedReports.length
                  : sortedReports.filter((report) => report.status === filter).length;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setHistoryFilter(filter)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                    historyFilter === filter
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {filter} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No verification reports yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Upload a PDF above to generate an AI-assisted advisory report.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <VerificationReportCard
                key={report.id}
                report={report}
                canReview={canReview}
                onAccept={acceptDocumentVerification}
                onReject={rejectDocumentVerification}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pb-2">
        <span className="inline-flex items-center gap-1.5">
          <UploadCloud className="w-3.5 h-3.5" />
          Documents are processed for text only; no file is published to third parties.
        </span>
        <span className="inline-flex items-center gap-1.5">
          {pendingCount === 0 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-amber-500" />
          )}
          {pendingCount} pending officer decision(s)
        </span>
      </div>
    </div>
  );
};

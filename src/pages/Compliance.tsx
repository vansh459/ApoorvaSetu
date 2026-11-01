import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  filterApplicationsForUser,
  filterComplianceForUser,
  filterUndertakingsForUser
} from '../services/rbacService';
import { authService } from '../services/authService';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import type { Undertaking } from '../types';
import { resolveWorkflowConfig } from '../workflow/config';
import { routeRequiresStage } from '../workflow/routes';
import {
  UNDERTAKING_CONDITIONS,
  defaultDueDate,
  getUndertakingCondition,
  latestEvidence,
  summariseUndertakings,
  undertakingBucket
} from '../workflow/undertakings';
import type { UndertakingBucket } from '../workflow/undertakings';
import { undertakingDueWindow } from '../workflow/sla';
import { formatDisplayDate, getNow, toIsoDate } from '../utils/dates';

type TabKey = 'All' | 'Open' | UndertakingBucket;

type DialogState =
  | { mode: 'create' }
  | { mode: 'submit'; undertaking: Undertaking }
  | { mode: 'reject'; undertaking: Undertaking }
  | null;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Open', label: 'Open' },
  { key: 'Pending', label: 'Awaiting evidence' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Overdue', label: 'Overdue' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Rejected', label: 'Rejected' }
];

const BUCKET_ORDER: Record<UndertakingBucket, number> = {
  Overdue: 0,
  Pending: 1,
  Submitted: 2,
  Rejected: 3,
  Verified: 4
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export const Compliance: React.FC = () => {
  const {
    undertakings,
    complianceRecords,
    applications,
    setActiveModal,
    verifyCompliance,
    createUndertaking,
    submitUndertakingEvidence,
    verifyUndertaking,
    rejectUndertaking
  } = useApp();
  const { user, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('Open');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [createForm, setCreateForm] = useState({
    applicationId: '',
    conditionCode: UNDERTAKING_CONDITIONS[0].code,
    dueDate: '',
    note: ''
  });
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState('');

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const now = getNow();

  const scopedUndertakings = useMemo(
    () => filterUndertakingsForUser(undertakings, user),
    [undertakings, user]
  );
  const scopedCompliance = useMemo(
    () => filterComplianceForUser(complianceRecords, user),
    [complianceRecords, user]
  );
  const eligibleApplications = useMemo(
    () =>
      filterApplicationsForUser(applications, user).filter(
        (app) =>
          app.status !== 'Approved' &&
          app.status !== 'Rejected' &&
          routeRequiresStage(app, 'Approval (Subject to Undertaking)')
      ),
    [applications, user]
  );

  const summary = summariseUndertakings(scopedUndertakings, config, now);

  const rows = scopedUndertakings
    .map((item) => ({
      item,
      bucket: undertakingBucket(item, config, now),
      window: undertakingDueWindow(item, config, now)
    }))
    .sort(
      (a, b) =>
        BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] ||
        a.item.dueDate.localeCompare(b.item.dueDate)
    );

  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter(({ item, bucket }) => {
    const matchesSearch =
      !query ||
      `${item.id} ${item.title} ${item.conditionCode} ${item.instituteName} ${item.applicationId}`
        .toLowerCase()
        .includes(query);
    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Open'
        ? bucket !== 'Verified' && bucket !== 'Rejected'
        : bucket === activeTab);
    return matchesSearch && matchesTab;
  });

  const filteredCompliance = scopedCompliance.filter((record) => {
    if (!query) return true;
    return `${record.id} ${record.title} ${record.instituteName} ${record.category}`
      .toLowerCase()
      .includes(query);
  });

  const counts: Record<TabKey, number> = {
    All: summary.total,
    Open: summary.open,
    Pending: summary.pending,
    Submitted: summary.submitted,
    Overdue: summary.overdue,
    Verified: summary.verified,
    Rejected: summary.rejected
  };

  const cards = [
    {
      key: 'Open' as TabKey,
      label: 'Open conditions',
      hint: 'Evidence or verification pending',
      value: summary.open,
      icon: ClipboardList,
      iconClass: 'bg-blue-50 text-blue-700'
    },
    {
      key: 'Pending' as TabKey,
      label: 'Awaiting evidence',
      hint: 'Institution action required',
      value: summary.pending,
      icon: FileClock,
      iconClass: 'bg-amber-50 text-amber-700'
    },
    {
      key: 'Submitted' as TabKey,
      label: 'Submitted for verification',
      hint: 'Officer review pending',
      value: summary.submitted,
      icon: ShieldCheck,
      iconClass: 'bg-sky-50 text-sky-700'
    },
    {
      key: 'Overdue' as TabKey,
      label: 'Overdue undertakings',
      hint: 'Escalated by the SLA sweep',
      value: summary.overdue,
      icon: AlertTriangle,
      iconClass: 'bg-rose-50 text-rose-700'
    },
    {
      key: 'Verified' as TabKey,
      label: 'Verified conditions',
      hint: 'Cleared for final approval',
      value: summary.verified,
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-700'
    }
  ];

  const openCreateDialog = () => {
    const firstApp = eligibleApplications[0];
    const usedCodes = new Set(
      undertakings
        .filter(
          (item) =>
            item.applicationId === firstApp?.id &&
            item.status !== 'Verified' &&
            item.status !== 'Rejected'
        )
        .map((item) => item.conditionCode)
    );
    const conditionCode =
      UNDERTAKING_CONDITIONS.find((condition) => !usedCodes.has(condition.code))?.code ??
      UNDERTAKING_CONDITIONS[0].code;
    setCreateForm({
      applicationId: firstApp?.id ?? '',
      conditionCode,
      dueDate: defaultDueDate(conditionCode, config, now),
      note: ''
    });
    setFormError('');
    setDialog({ mode: 'create' });
  };

  const handleCreateApplicationChange = (applicationId: string) => {
    const usedCodes = new Set(
      undertakings
        .filter(
          (item) =>
            item.applicationId === applicationId &&
            item.status !== 'Verified' &&
            item.status !== 'Rejected'
        )
        .map((item) => item.conditionCode)
    );
    const conditionCode =
      UNDERTAKING_CONDITIONS.find((condition) => !usedCodes.has(condition.code))?.code ??
      UNDERTAKING_CONDITIONS[0].code;
    setCreateForm((prev) => ({
      ...prev,
      applicationId,
      conditionCode,
      dueDate: defaultDueDate(conditionCode, config, now)
    }));
  };

  const handleCreateConditionChange = (conditionCode: string) => {
    setCreateForm((prev) => ({
      ...prev,
      conditionCode,
      dueDate: defaultDueDate(conditionCode, config, now)
    }));
  };

  const openSubmitDialog = (undertaking: Undertaking) => {
    setEvidenceTitle(
      `${undertaking.conditionCode.replace('UND_', '')}_evidence_${toIsoDate(now).slice(0, 4)}.pdf`
    );
    setFormError('');
    setDialog({ mode: 'submit', undertaking });
  };

  const openRejectDialog = (undertaking: Undertaking) => {
    setRejectionReason('');
    setFormError('');
    setDialog({ mode: 'reject', undertaking });
  };

  const closeDialog = () => setDialog(null);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!createForm.applicationId) {
      setFormError('Select the application this condition belongs to.');
      return;
    }
    if (createUndertaking(createForm)) closeDialog();
  };

  const handleSubmitEvidence = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dialog || dialog.mode !== 'submit') return;
    if (!evidenceTitle.trim()) {
      setFormError('Name the evidence file before submitting.');
      return;
    }
    if (submitUndertakingEvidence(dialog.undertaking.id, evidenceTitle)) closeDialog();
  };

  const handleReject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dialog || dialog.mode !== 'reject') return;
    if (!rejectionReason.trim()) {
      setFormError('Record the reason for rejecting this evidence.');
      return;
    }
    if (rejectUndertaking(dialog.undertaking.id, rejectionReason)) closeDialog();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Undertakings & Statutory Compliance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track time-bound conditions, verify evidence, and clear cases for final approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {hasPermission('compliance.verify') && (
            <button
              onClick={openCreateDialog}
              className={`flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer ${focusRing}`}
            >
              <Plus className="w-4 h-4" />
              <span>Record undertaking</span>
            </button>
          )}
          {hasPermission('compliance.submit') && (
            <button
              onClick={() => setActiveModal('upload-compliance')}
              className={`flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${focusRing}`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload compliance dossier</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          const active = activeTab === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setActiveTab(card.key)}
              aria-pressed={active}
              className={`text-left bg-white p-4 rounded-2xl border shadow-2xs flex flex-col justify-between transition-colors duration-150 cursor-pointer ${
                active
                  ? 'border-slate-900 ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300'
              } ${focusRing}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.iconClass}`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xl font-black text-slate-900 tabular-nums">
                  {card.value.toLocaleString()}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-700 leading-tight">
                  {card.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{card.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by condition, institution, or application"
            aria-label="Search undertakings and compliance records"
            className={`w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 ${focusRing}`}
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto self-start lg:self-auto max-w-full">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${focusRing} ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] font-bold text-slate-400 tabular-nums">
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Time-bound undertakings</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filteredRows.length} of {rows.length} conditions in this view
            </p>
          </div>
          {summary.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {summary.overdue} overdue and escalated
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                <th scope="col" className="py-3 px-4">Reference</th>
                <th scope="col" className="py-3 px-4">Condition</th>
                <th scope="col" className="py-3 px-4">Institution</th>
                <th scope="col" className="py-3 px-4">Evidence due</th>
                <th scope="col" className="py-3 px-4">Evidence</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No undertakings match this view.
                    {hasPermission('compliance.verify') && (
                      <button
                        onClick={openCreateDialog}
                        className={`ml-1.5 font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline cursor-pointer ${focusRing}`}
                      >
                        Record one
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ item, bucket, window: dueWindow }) => {
                  const evidence = latestEvidence(item);
                  const canSubmit =
                    hasPermission('compliance.submit') &&
                    (bucket === 'Pending' || bucket === 'Overdue' || bucket === 'Rejected');
                  const canReview =
                    hasPermission('compliance.verify') && item.status === 'Submitted';

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors duration-150">
                      <td className="py-3 px-4 font-bold text-blue-600 tabular-nums whitespace-nowrap">
                        {item.id}
                      </td>
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-semibold text-slate-800 leading-snug">{item.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.conditionCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">{item.instituteName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.applicationId}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">
                          {formatDisplayDate(item.dueDate)}
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            dueWindow.daysOverdue > 0 && bucket !== 'Verified'
                              ? 'text-rose-600 font-semibold'
                              : bucket === 'Verified' || bucket === 'Rejected'
                                ? 'text-slate-400'
                                : 'text-slate-500'
                          }`}
                        >
                          {dueWindow.daysOverdue > 0 && bucket !== 'Verified'
                            ? bucket === 'Submitted'
                              ? `${dueWindow.daysOverdue} day(s) overdue — evidence submitted`
                              : `${dueWindow.daysOverdue} day(s) overdue`
                            : bucket === 'Verified'
                              ? 'Condition cleared'
                              : bucket === 'Rejected'
                                ? 'Evidence rejected'
                                : `${dueWindow.daysRemaining} day(s) remaining`}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        {evidence ? (
                          <div className="font-medium text-slate-700 truncate" title={evidence}>
                            {evidence}
                          </div>
                        ) : (
                          <div className="text-slate-400">Not furnished</div>
                        )}
                        {item.evidenceDocumentIds.length > 1 && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.evidenceDocumentIds.length} files on record
                          </div>
                        )}
                        {bucket === 'Rejected' && item.rejectionReason && (
                          <div
                            className="text-[11px] text-rose-600 mt-0.5 line-clamp-2"
                            title={item.rejectionReason}
                          >
                            {item.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={bucket} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {canSubmit && (
                            <button
                              onClick={() => openSubmitDialog(item)}
                              className={`px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer ${focusRing}`}
                            >
                              {bucket === 'Rejected' ? 'Resubmit' : 'Submit evidence'}
                            </button>
                          )}
                          {canReview && (
                            <>
                              <button
                                onClick={() => openRejectDialog(item)}
                                className={`px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${focusRing}`}
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => verifyUndertaking(item.id)}
                                className={`px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer ${focusRing}`}
                              >
                                Verify
                              </button>
                            </>
                          )}
                          {!canSubmit && !canReview && (
                            <span className="text-[11px] text-slate-400 text-right">
                              {bucket === 'Verified'
                                ? 'Cleared'
                                : bucket === 'Submitted'
                                  ? 'Awaiting officer'
                                  : 'Awaiting institution'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Compliance dossiers</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Submitted declarations and statutory documents awaiting officer verification.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                <th scope="col" className="py-3 px-4">Record</th>
                <th scope="col" className="py-3 px-4">Dossier</th>
                <th scope="col" className="py-3 px-4">Institution</th>
                <th scope="col" className="py-3 px-4">Category</th>
                <th scope="col" className="py-3 px-4">Due date</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompliance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No compliance dossiers match this search.
                  </td>
                </tr>
              ) : (
                filteredCompliance.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/40 transition-colors duration-150">
                    <td className="py-3 px-4 font-bold text-blue-600 tabular-nums">{record.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs">
                      {record.title}
                      {record.documentRef && (
                        <div className="text-[11px] text-slate-400 mt-0.5 font-normal">
                          {record.documentRef}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{record.instituteName}</td>
                    <td className="py-3 px-4 text-slate-500">{record.category}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {formatDisplayDate(record.dueDate)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={record.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {record.status !== 'Verified' && hasPermission('compliance.verify') ? (
                        <button
                          onClick={() => verifyCompliance(record.id)}
                          className={`px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer ${focusRing}`}
                        >
                          Verify and clear
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center">
                          {record.status === 'Verified' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Complied
                            </>
                          ) : (
                            <span className="text-slate-400">Awaiting officer</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={dialog?.mode === 'create'}
        onClose={closeDialog}
        title="Record a time-bound undertaking"
        subtitle="A condition imposed at approval-in-principle, with an evidence deadline."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="undertaking-application" className="block text-xs font-semibold text-slate-700 mb-1">
              Application
            </label>
            <select
              id="undertaking-application"
              value={createForm.applicationId}
              onChange={(event) => handleCreateApplicationChange(event.target.value)}
              className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 ${focusRing}`}
            >
              {eligibleApplications.length === 0 && <option value="">No application at conditional approval</option>}
              {eligibleApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.id} — {app.instituteName}
                </option>
              ))}
            </select>
            {eligibleApplications.length === 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                Move a case into Approval (Subject to Undertaking) before recording a condition.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="undertaking-condition" className="block text-xs font-semibold text-slate-700 mb-1">
                Condition
              </label>
              <select
                id="undertaking-condition"
                value={createForm.conditionCode}
                onChange={(event) => handleCreateConditionChange(event.target.value)}
                className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 ${focusRing}`}
              >
                {UNDERTAKING_CONDITIONS.map((condition) => (
                  <option key={condition.code} value={condition.code}>
                    {condition.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="undertaking-due" className="block text-xs font-semibold text-slate-700 mb-1">
                Evidence due
              </label>
              <input
                id="undertaking-due"
                type="date"
                value={createForm.dueDate}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 ${focusRing}`}
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {getUndertakingCondition(createForm.conditionCode)?.description}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="undertaking-note" className="block text-xs font-semibold text-slate-700 mb-1">
              Officer note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="undertaking-note"
              rows={3}
              value={createForm.note}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Record why this condition is being imposed."
              className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 ${focusRing}`}
            />
          </div>

          {formError && <p className="text-[11px] font-semibold text-rose-600">{formError}</p>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeDialog}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer ${focusRing}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={eligibleApplications.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors ${focusRing} ${
                eligibleApplications.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              Record undertaking
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={dialog?.mode === 'submit'}
        onClose={closeDialog}
        title={dialog?.mode === 'submit' ? `Submit evidence — ${dialog.undertaking.title}` : 'Submit evidence'}
        subtitle={
          dialog?.mode === 'submit'
            ? `${dialog.undertaking.applicationId} · due ${formatDisplayDate(dialog.undertaking.dueDate)}`
            : undefined
        }
      >
        <form onSubmit={handleSubmitEvidence} className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {dialog?.mode === 'submit'
                  ? getUndertakingCondition(dialog.undertaking.conditionCode)?.description
                  : 'Attach the evidence that satisfies this condition.'}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="evidence-title" className="block text-xs font-semibold text-slate-700 mb-1">
              Evidence file name
            </label>
            <input
              id="evidence-title"
              type="text"
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
              className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 ${focusRing}`}
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Demo mode records the document metadata. Production uploads the file to the secure
              documents bucket.
            </p>
          </div>

          {formError && <p className="text-[11px] font-semibold text-rose-600">{formError}</p>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeDialog}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer ${focusRing}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer ${focusRing}`}
            >
              Submit evidence
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={dialog?.mode === 'reject'}
        onClose={closeDialog}
        title={dialog?.mode === 'reject' ? `Reject evidence — ${dialog.undertaking.title}` : 'Reject evidence'}
        subtitle="The institution receives the reason and can resubmit."
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label htmlFor="rejection-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for rejection
            </label>
            <textarea
              id="rejection-reason"
              rows={4}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="State what is missing or non-compliant so the institution can correct it."
              className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 ${focusRing}`}
            />
          </div>

          {formError && <p className="text-[11px] font-semibold text-rose-600">{formError}</p>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeDialog}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer ${focusRing}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer ${focusRing}`}
            >
              <XCircle className="w-4 h-4" />
              Reject evidence
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

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
import {
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
  StatTile,
  Tabs,
  Textarea
} from '../components/ui';
import type { DataTableColumn } from '../components/ui';
import type { ComplianceRecord, Undertaking } from '../types';
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

type UndertakingRow = {
  item: Undertaking;
  bucket: UndertakingBucket;
  window: ReturnType<typeof undertakingDueWindow>;
};

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

  const rows: UndertakingRow[] = scopedUndertakings
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

  const undertakingColumns: DataTableColumn<UndertakingRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: ({ item }) => (
        <span className="whitespace-nowrap font-medium tabular-nums text-ink">{item.id}</span>
      )
    },
    {
      key: 'condition',
      header: 'Condition',
      render: ({ item }) => (
        <div className="max-w-[220px]">
          <div className="font-medium leading-snug text-ink">{item.title}</div>
          <div className="mt-0.5 text-xs text-ink-2">{item.conditionCode}</div>
        </div>
      )
    },
    {
      key: 'institution',
      header: 'Institution',
      render: ({ item }) => (
        <div>
          <div className="text-ink">{item.instituteName}</div>
          <div className="mt-0.5 text-xs text-ink-2">{item.applicationId}</div>
        </div>
      )
    },
    {
      key: 'due',
      header: 'Evidence due',
      render: ({ item, bucket, window: dueWindow }) => (
        <div className="whitespace-nowrap">
          <div className="text-ink">{formatDisplayDate(item.dueDate)}</div>
          <div
            className={`mt-0.5 text-xs ${
              dueWindow.daysOverdue > 0 && bucket !== 'Verified'
                ? 'font-semibold text-danger'
                : 'text-ink-2'
            }`}
          >
            {dueWindow.daysOverdue > 0 && bucket !== 'Verified'
              ? bucket === 'Submitted'
                ? `${dueWindow.daysOverdue} day(s) overdue. Evidence submitted.`
                : `${dueWindow.daysOverdue} day(s) overdue`
              : bucket === 'Verified'
                ? 'Condition cleared'
                : bucket === 'Rejected'
                  ? 'Evidence rejected'
                  : `${dueWindow.daysRemaining} day(s) remaining`}
          </div>
        </div>
      )
    },
    {
      key: 'evidence',
      header: 'Evidence',
      render: ({ item, bucket }) => {
        const evidence = latestEvidence(item);
        return (
          <div className="max-w-[220px]">
            {evidence ? (
              <div className="truncate text-ink" title={evidence}>
                {evidence}
              </div>
            ) : (
              <div className="text-ink-2">Not furnished</div>
            )}
            {item.evidenceDocumentIds.length > 1 && (
              <div className="mt-0.5 text-xs text-ink-2">
                {item.evidenceDocumentIds.length} files on record
              </div>
            )}
            {bucket === 'Rejected' && item.rejectionReason && (
              <div
                className="mt-0.5 line-clamp-2 text-xs text-danger"
                title={item.rejectionReason}
              >
                {item.rejectionReason}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: ({ bucket }) => <StatusBadge status={bucket} size="sm" />
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: ({ item, bucket }) => {
        const canSubmit =
          hasPermission('compliance.submit') &&
          (bucket === 'Pending' || bucket === 'Overdue' || bucket === 'Rejected');
        const canReview = hasPermission('compliance.verify') && item.status === 'Submitted';

        return (
          <div className="flex items-center justify-end gap-2">
            {canSubmit && (
              <Button size="sm" onClick={() => openSubmitDialog(item)}>
                {bucket === 'Rejected' ? 'Resubmit' : 'Submit evidence'}
              </Button>
            )}
            {canReview && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openRejectDialog(item)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  onClick={() => verifyUndertaking(item.id)}
                >
                  Verify
                </Button>
              </>
            )}
            {!canSubmit && !canReview && (
              <span className="whitespace-nowrap text-xs text-ink-2">
                {bucket === 'Verified'
                  ? 'Cleared'
                  : bucket === 'Submitted'
                    ? 'Awaiting officer'
                    : 'Awaiting institution'}
              </span>
            )}
          </div>
        );
      }
    }
  ];

  const complianceColumns: DataTableColumn<ComplianceRecord>[] = [
    {
      key: 'record',
      header: 'Record',
      render: (record) => (
        <span className="font-medium tabular-nums text-ink">{record.id}</span>
      )
    },
    {
      key: 'dossier',
      header: 'Dossier',
      render: (record) => (
        <div className="max-w-xs">
          <div className="font-medium text-ink">{record.title}</div>
          {record.documentRef && (
            <div className="mt-0.5 text-xs text-ink-2">{record.documentRef}</div>
          )}
        </div>
      )
    },
    {
      key: 'institution',
      header: 'Institution',
      render: (record) => <span className="text-ink">{record.instituteName}</span>
    },
    {
      key: 'category',
      header: 'Category',
      render: (record) => <span className="text-ink-2">{record.category}</span>
    },
    {
      key: 'due',
      header: 'Due date',
      render: (record) => (
        <span className="whitespace-nowrap text-ink">{formatDisplayDate(record.dueDate)}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (record) => <StatusBadge status={record.status} size="sm" />
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (record) =>
        record.status !== 'Verified' && hasPermission('compliance.verify') ? (
          <Button size="sm" variant="secondary" onClick={() => verifyCompliance(record.id)}>
            Verify and clear
          </Button>
        ) : (
          <span className="inline-flex items-center text-xs text-ink-2">
            {record.status === 'Verified' ? (
              <>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-success" aria-hidden="true" />
                Complied
              </>
            ) : (
              'Awaiting officer'
            )}
          </span>
        )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Undertakings and compliance"
        description="Track time-bound conditions, verify evidence, and clear cases for final approval."
        actions={
          <>
            {hasPermission('compliance.verify') && (
              <Button
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreateDialog}
              >
                Record undertaking
              </Button>
            )}
            {hasPermission('compliance.submit') && (
              <Button
                icon={<Upload className="h-4 w-4" />}
                onClick={() => setActiveModal('upload-compliance')}
              >
                Upload compliance dossier
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Open conditions"
          value={summary.open}
          delta="Evidence or verification pending"
          icon={ClipboardList}
          onClick={() => setActiveTab('Open')}
        />
        <StatTile
          label="Awaiting evidence"
          value={summary.pending}
          delta="Institution action required"
         
          icon={FileClock}
          onClick={() => setActiveTab('Pending')}
        />
        <StatTile
          label="Submitted"
          value={summary.submitted}
          delta="Officer review pending"
         
          icon={ShieldCheck}
          onClick={() => setActiveTab('Submitted')}
        />
        <StatTile
          label="Overdue"
          value={summary.overdue}
          delta="Escalated by the SLA sweep"
         
          icon={AlertTriangle}
          onClick={() => setActiveTab('Overdue')}
        />
        <StatTile
          label="Verified"
          value={summary.verified}
          delta="Cleared for final approval"
         
          icon={CheckCircle2}
          onClick={() => setActiveTab('Verified')}
        />
      </div>

      <Card>
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by condition, institution, or application"
              aria-label="Search undertakings and compliance records"
              className="pl-9"
            />
          </div>

          <Tabs
            ariaLabel="Filter undertakings by state"
            items={TABS.map((tab) => ({
              id: tab.key,
              label: tab.label,
              count: counts[tab.key]
            }))}
            value={activeTab}
            onChange={(id) => setActiveTab(id as TabKey)}
          />
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Time-bound undertakings</h2>
            <p className="mt-0.5 text-xs text-ink-2">
              {filteredRows.length} of {rows.length} conditions in this view
            </p>
          </div>
          {summary.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.overdue} overdue and escalated
            </span>
          )}
        </div>

        <DataTable<UndertakingRow>
          caption="Time-bound undertakings with condition, evidence deadline and status"
          columns={undertakingColumns}
          rows={filteredRows}
          rowKey={(row) => row.item.id}
          minWidth="1040px"
          empty={
            <EmptyState
              title="No undertakings in this view"
              description="Record a condition when a case moves into approval subject to undertaking."
              action={
                hasPermission('compliance.verify') ? (
                  <Button variant="secondary" onClick={openCreateDialog}>
                    Record undertaking
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Compliance dossiers</h2>
          <p className="mt-0.5 text-xs text-ink-2">
            Submitted declarations and statutory documents awaiting officer verification.
          </p>
        </div>

        <DataTable<ComplianceRecord>
          caption="Compliance dossiers awaiting officer verification"
          columns={complianceColumns}
          rows={filteredCompliance}
          rowKey={(record) => record.id}
          minWidth="940px"
          empty={
            <EmptyState
              title="No compliance dossiers match this search"
              description="Clear the search to see every dossier in your jurisdiction."
            />
          }
        />
      </section>

      <Modal
        isOpen={dialog?.mode === 'create'}
        onClose={closeDialog}
        title="Record a time-bound undertaking"
        subtitle="A condition imposed at approval-in-principle, with an evidence deadline."
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-undertaking-form"
              disabled={eligibleApplications.length === 0}
            >
              Record undertaking
            </Button>
          </>
        }
      >
        <form id="create-undertaking-form" onSubmit={handleCreate} className="space-y-4">
          <Field
            label="Application"
            htmlFor="undertaking-application"
            hint={
              eligibleApplications.length === 0
                ? 'Move a case into Approval (Subject to Undertaking) before recording a condition.'
                : undefined
            }
          >
            <Select
              id="undertaking-application"
              value={createForm.applicationId}
              onChange={(event) => handleCreateApplicationChange(event.target.value)}
            >
              {eligibleApplications.length === 0 && (
                <option value="">No application at conditional approval</option>
              )}
              {eligibleApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.id} / {app.instituteName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Condition" htmlFor="undertaking-condition">
              <Select
                id="undertaking-condition"
                value={createForm.conditionCode}
                onChange={(event) => handleCreateConditionChange(event.target.value)}
              >
                {UNDERTAKING_CONDITIONS.map((condition) => (
                  <option key={condition.code} value={condition.code}>
                    {condition.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Evidence due" htmlFor="undertaking-due">
              <Input
                id="undertaking-due"
                type="date"
                value={createForm.dueDate}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
              />
            </Field>
          </div>

          <Notice icon={FileText}>
            {getUndertakingCondition(createForm.conditionCode)?.description}
          </Notice>

          <Field label="Officer note" htmlFor="undertaking-note" hint="Optional.">
            <Textarea
              id="undertaking-note"
              rows={3}
              value={createForm.note}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Record why this condition is being imposed."
            />
          </Field>

          {formError && (
            <p role="alert" className="text-xs font-medium text-danger">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={dialog?.mode === 'submit'}
        onClose={closeDialog}
        title={
          dialog?.mode === 'submit'
            ? `Submit evidence: ${dialog.undertaking.title}`
            : 'Submit evidence'
        }
        subtitle={
          dialog?.mode === 'submit'
            ? `${dialog.undertaking.applicationId}, due ${formatDisplayDate(dialog.undertaking.dueDate)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" form="submit-evidence-form">
              Submit evidence
            </Button>
          </>
        }
      >
        <form id="submit-evidence-form" onSubmit={handleSubmitEvidence} className="space-y-4">
          <Notice icon={ShieldCheck}>
            {dialog?.mode === 'submit'
              ? getUndertakingCondition(dialog.undertaking.conditionCode)?.description
              : 'Attach the evidence that satisfies this condition.'}
          </Notice>

          <Field
            label="Evidence file name"
            htmlFor="evidence-title"
            hint="Demo mode records the document metadata. Production uploads the file to the secure documents bucket."
          >
            <Input
              id="evidence-title"
              type="text"
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
            />
          </Field>

          {formError && (
            <p role="alert" className="text-xs font-medium text-danger">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={dialog?.mode === 'reject'}
        onClose={closeDialog}
        title={
          dialog?.mode === 'reject'
            ? `Reject evidence: ${dialog.undertaking.title}`
            : 'Reject evidence'
        }
        subtitle="The institution receives the reason and can resubmit."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="reject-evidence-form"
              variant="danger"
              icon={<XCircle className="h-4 w-4" />}
            >
              Reject evidence
            </Button>
          </>
        }
      >
        <form id="reject-evidence-form" onSubmit={handleReject} className="space-y-4">
          <Field label="Reason for rejection" htmlFor="rejection-reason" required>
            <Textarea
              id="rejection-reason"
              rows={4}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="State what is missing or non-compliant so the institution can correct it."
            />
          </Field>

          {formError && (
            <p role="alert" className="text-xs font-medium text-danger">
              {formError}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
};

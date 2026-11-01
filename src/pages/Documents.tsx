import React, { useMemo, useState } from 'react';
import {
  Upload,
  Search,
  FileText,
  Download,
  Eye,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  FileClock,
  RefreshCw,
  XCircle,
  Paperclip,
  Building2,
  History
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  filterDocumentsForUser,
  filterInstitutesForUser,
  hasPermission
} from '../services/rbacService';
import { authService } from '../services/authService';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatTile,
  Tabs,
  Textarea
} from '../components/ui';
import { DocumentItem } from '../types';
import { resolveWorkflowConfig } from '../workflow/config';
import {
  DOCUMENT_TYPES,
  canRequestRenewal,
  canSubmitRenewal,
  defaultExpiryDate,
  documentValidity,
  documentsForRenewal,
  getDocumentType,
  isRenewalRecord,
  summariseDocuments,
  validityLabel
} from '../workflow/documents';
import { formatDisplayDate, getNow, toIsoDate } from '../utils/dates';
import { statusTone } from '../utils/statusTone';

type ValidityFilter =
  | 'All'
  | 'Needs renewal'
  | 'Valid'
  | 'Expiring soon'
  | 'Critical'
  | 'Expired'
  | 'Renewals';

const FILTERS: ValidityFilter[] = [
  'All',
  'Needs renewal',
  'Valid',
  'Expiring soon',
  'Critical',
  'Expired',
  'Renewals'
];

const TIER_RANK: Record<string, number> = {
  Expired: 0,
  Critical: 1,
  'Expiring Soon': 2,
  Valid: 3
};

const TIER_LABEL: Record<string, string> = {
  Valid: 'Valid',
  'Expiring Soon': 'Expiring soon',
  Critical: 'Critical',
  Expired: 'Expired'
};

interface FileMeta {
  name: string;
  size: string;
  type: string;
}

function fileMetaFrom(file: File): FileMeta {
  const extension = file.name.split('.').pop()?.toUpperCase() ?? 'PDF';
  return {
    name: file.name,
    size: `${Math.max(0.1, file.size / (1024 * 1024)).toFixed(1)} MB`,
    type: extension === 'JPEG' ? 'JPG' : extension
  };
}

export const Documents: React.FC = () => {
  const {
    documents,
    institutes,
    uploadDocument,
    requestDocumentRenewal,
    submitDocumentRenewal,
    verifyDocument,
    rejectDocument,
    showToast
  } = useApp();
  const { user } = useAuth();

  const config = useMemo(() => resolveWorkflowConfig(authService.getSystemConfig()), []);
  const canUpload = hasPermission(user, 'documents.upload');
  const canVerify = hasPermission(user, 'documents.verify');

  const scopedDocs = useMemo(() => filterDocumentsForUser(documents, user), [documents, user]);
  const scopedInstitutes = useMemo(() => filterInstitutesForUser(institutes, user), [institutes, user]);
  const defaultInstitute = useMemo(
    () => scopedInstitutes.find((institute) => institute.id === user?.instituteId) ?? scopedInstitutes[0],
    [scopedInstitutes, user]
  );

  const summary = useMemo(
    () => summariseDocuments(scopedDocs, config.documentWarningDays),
    [scopedDocs, config.documentWarningDays]
  );
  const renewalQueue = useMemo(
    () => documentsForRenewal(scopedDocs, config.documentWarningDays),
    [scopedDocs, config.documentWarningDays]
  );
  const renewalQueueIds = useMemo(() => new Set(renewalQueue.map((doc) => doc.id)), [renewalQueue]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>('All');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [docType, setDocType] = useState('LAND_LEASE_DEED');
  const [docTitle, setDocTitle] = useState('');
  const [docIssuedOn, setDocIssuedOn] = useState(toIsoDate(getNow()));
  const [docExpiryDate, setDocExpiryDate] = useState(
    defaultExpiryDate(toIsoDate(getNow()), 'LAND_LEASE_DEED')
  );
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [docInstId, setDocInstId] = useState(user?.instituteId ?? '');
  const [docFile, setDocFile] = useState<FileMeta | null>(null);

  const [renewalDoc, setRenewalDoc] = useState<DocumentItem | null>(null);
  const [renewalExpiry, setRenewalExpiry] = useState('');
  const [renewalNote, setRenewalNote] = useState('');
  const [renewalFile, setRenewalFile] = useState<FileMeta | null>(null);

  const [rejectTarget, setRejectTarget] = useState<DocumentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const validityFor = (doc: DocumentItem) => documentValidity(doc, config.documentWarningDays);

  const matchesFilter = (doc: DocumentItem, filter: ValidityFilter): boolean => {
    const tier = validityFor(doc).tier;
    switch (filter) {
      case 'Needs renewal':
        return renewalQueueIds.has(doc.id);
      case 'Valid':
      case 'Expiring soon':
      case 'Critical':
      case 'Expired':
        if (isRenewalRecord(doc) || doc.status === 'Superseded') return false;
        return TIER_LABEL[tier] === filter;
      case 'Renewals':
        return Boolean(doc.renewalStatus) || isRenewalRecord(doc);
      default:
        return true;
    }
  };

  const filteredDocs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const tierOf = (doc: DocumentItem) => documentValidity(doc, config.documentWarningDays);
    const matchesValidity = (doc: DocumentItem): boolean => {
      const tier = tierOf(doc).tier;
      switch (validityFilter) {
        case 'Needs renewal':
          return renewalQueueIds.has(doc.id);
        case 'Valid':
        case 'Expiring soon':
        case 'Critical':
        case 'Expired':
          if (isRenewalRecord(doc) || doc.status === 'Superseded') return false;
          return TIER_LABEL[tier] === validityFilter;
        case 'Renewals':
          return Boolean(doc.renewalStatus) || isRenewalRecord(doc);
        default:
          return true;
      }
    };

    return scopedDocs
      .filter((doc) => {
        const matchesSearch =
          !searchTerm ||
          doc.title.toLowerCase().includes(searchTerm) ||
          doc.instituteName.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory && matchesValidity(doc);
      })
      .sort((left, right) => {
        if (left.status === 'Superseded' && right.status !== 'Superseded') return 1;
        if (right.status === 'Superseded' && left.status !== 'Superseded') return -1;
        const leftTier = TIER_RANK[tierOf(left).tier] ?? 4;
        const rightTier = TIER_RANK[tierOf(right).tier] ?? 4;
        if (leftTier !== rightTier) return leftTier - rightTier;
        return tierOf(left).daysLeft - tierOf(right).daysLeft;
      });
  }, [
    scopedDocs,
    search,
    selectedCategory,
    validityFilter,
    renewalQueueIds,
    config.documentWarningDays
  ]);

  const countFor = (filter: ValidityFilter) =>
    filter === 'All' ? scopedDocs.length : scopedDocs.filter((doc) => matchesFilter(doc, filter)).length;

  const selectedInstitute =
    scopedInstitutes.find((institute) => institute.id === docInstId) ?? defaultInstitute;

  const openUpload = () => {
    const today = toIsoDate(getNow());
    setDocType('LAND_LEASE_DEED');
    setDocTitle('');
    setDocIssuedOn(today);
    setDocExpiryDate(defaultExpiryDate(today, 'LAND_LEASE_DEED'));
    setExpiryTouched(false);
    setDocInstId(user?.instituteId ?? scopedInstitutes[0]?.id ?? '');
    setDocFile(null);
    setIsUploadOpen(true);
  };

  const handleTypeChange = (code: string) => {
    const type = getDocumentType(code);
    setDocType(code);
    setDocExpiryDate(defaultExpiryDate(docIssuedOn || toIsoDate(getNow()), code));
    setExpiryTouched(false);
    if (type && !docTitle.trim()) setDocTitle(type.label);
  };

  const handleIssueChange = (value: string) => {
    setDocIssuedOn(value);
    if (!expiryTouched && value) {
      setDocExpiryDate(defaultExpiryDate(value, docType));
    }
  };

  const handleUploadSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const type = getDocumentType(docType);
    if (!selectedInstitute) {
      showToast('Select the institution this document belongs to.', 'error');
      return;
    }
    if (!docExpiryDate) {
      showToast('Enter the validity expiry date.', 'error');
      return;
    }

    const succeeded = uploadDocument({
      title: docTitle.trim() || type?.label || 'Institutional document',
      category: type?.category ?? 'AICTE Approvals',
      instituteName: selectedInstitute.name,
      instituteId: selectedInstitute.id,
      region: selectedInstitute.region,
      uploadDate: docIssuedOn || toIsoDate(getNow()),
      expiryDate: docExpiryDate,
      status: 'Pending',
      fileSize: docFile?.size ?? '2.4 MB',
      fileType: docFile?.type ?? 'PDF',
      documentTypeCode: docType
    });

    if (succeeded) setIsUploadOpen(false);
  };

  const openRenewal = (doc: DocumentItem) => {
    const validity = validityFor(doc);
    const base = validity.daysLeft > 0 ? doc.expiryDate : toIsoDate(getNow());
    setRenewalExpiry(
      defaultExpiryDate(
        base,
        getDocumentType(doc.documentTypeCode)?.code ?? 'AICTE_APPROVAL_LETTER'
      )
    );
    setRenewalNote('');
    setRenewalFile(null);
    setRenewalDoc(doc);
  };

  const handleRenewalSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!renewalDoc) return;
    const succeeded = submitDocumentRenewal(renewalDoc.id, {
      expiryDate: renewalExpiry,
      fileSize: renewalFile?.size,
      fileType: renewalFile?.type,
      storagePath: renewalFile?.name,
      note: renewalNote.trim() || undefined
    });
    if (succeeded) setRenewalDoc(null);
  };

  const handleRejectSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!rejectTarget) return;
    const succeeded = rejectDocument(rejectTarget.id, rejectReason);
    if (succeeded) {
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    const validity = validityFor(doc);
    const textContent = [
      'AICTE VERIFIED REPOSITORY DOCUMENT',
      '',
      `Title: ${doc.title}`,
      `Institution: ${doc.instituteName}`,
      `Category: ${doc.category}`,
      `Status: ${doc.status}`,
      `Uploaded: ${formatDisplayDate(doc.uploadDate)}`,
      `Validity: ${formatDisplayDate(doc.expiryDate)} (${validityLabel(validity)})`,
      `Renewal: ${doc.renewalStatus ?? 'None'}`,
      `Verified by: ${doc.verifiedBy ?? 'Pending officer verification'}`,
      '',
      'Digitally signed by AICTE National Portal.'
    ].join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded document: ${doc.title}`, 'success');
  };

  const successorOf = (docId: string) => scopedDocs.find((doc) => doc.renewalOfId === docId);
  const predecessorOf = (doc: DocumentItem) =>
    doc.renewalOfId ? scopedDocs.find((entry) => entry.id === doc.renewalOfId) : undefined;

  const filterItems = FILTERS.map((filter) => ({
    id: filter,
    label: filter,
    count: countFor(filter)
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document repository"
        description="Statutory validity, renewal chains and officer verification for every institutional record."
        actions={
          canUpload ? (
            <Button icon={<Upload className="h-4 w-4" />} onClick={openUpload}>
              Upload document
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Documents on record"
          value={summary.total}
          delta="Across the scoped repository"
          icon={FileText}
          onClick={() => setValidityFilter('All')}
        />
        <StatTile
          label="Valid"
          value={summary.valid}
          delta="No action required"
         
          icon={CheckCircle2}
          onClick={() => setValidityFilter('Valid')}
        />
        <StatTile
          label="Expiring soon"
          value={summary.expiringSoon}
          delta="31 to 60 days"
         
          icon={CalendarDays}
          onClick={() => setValidityFilter('Expiring soon')}
        />
        <StatTile
          label="Critical"
          value={summary.critical}
          delta="30 days or less"
         
          icon={AlertTriangle}
          onClick={() => setValidityFilter('Critical')}
        />
        <StatTile
          label="Expired"
          value={summary.expired}
          delta={`${summary.actionable} need renewal`}
         
          icon={XCircle}
          onClick={() => setValidityFilter('Expired')}
        />
      </div>

      <Card>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or institution"
                aria-label="Search documents"
                className="pl-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Filter by document category"
            >
              <option value="All">All categories</option>
              <option value="Land & Building">Land & Building</option>
              <option value="Fire Safety">Fire Safety</option>
              <option value="AICTE Approvals">AICTE Approvals</option>
              <option value="Affiliation">Affiliation</option>
              <option value="Audit & Finance">Audit & Finance</option>
            </Select>
          </div>

          <Tabs
            ariaLabel="Filter documents by validity"
            items={filterItems}
            value={validityFilter}
            onChange={(id) => setValidityFilter(id as ValidityFilter)}
          />
        </div>
      </Card>

      {filteredDocs.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No documents match this view"
            description="Clear the search or choose another validity filter to see the repository."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setValidityFilter('All');
                }}
              >
                Reset filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocs.map((doc) => {
            const validity = validityFor(doc);
            const successor = successorOf(doc.id);
            const predecessor = predecessorOf(doc);
            const superseded = doc.status === 'Superseded';
            const requestable = canUpload && canRequestRenewal(doc, config.documentWarningDays);
            const renewable = canUpload && canSubmitRenewal(doc);
            const awaitingVerification =
              (doc.renewalStatus === 'Requested' || doc.renewalStatus === 'Submitted') &&
              !renewable &&
              !isRenewalRecord(doc);

            return (
              <article
                key={doc.id}
                className="flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-raise"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Badge>{doc.category}</Badge>
                    <StatusBadge status={doc.status} size="sm" />
                  </div>

                  <h3 className="break-words text-sm font-semibold leading-snug text-ink">
                    {doc.title}
                  </h3>

                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                    <span className="truncate">{doc.instituteName}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {!superseded && (
                      <Badge tone={statusTone(validity.tier)}>
                        <CalendarDays className="mr-1 h-3 w-3" aria-hidden="true" />
                        {TIER_LABEL[validity.tier] ?? 'Valid'}
                      </Badge>
                    )}
                    {doc.renewalStatus && (
                      <Badge tone={statusTone(doc.renewalStatus)}>
                        Renewal {doc.renewalStatus.toLowerCase()}
                      </Badge>
                    )}
                    {superseded && successor && (
                      <Badge>Superseded by {successor.id}</Badge>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-ink-2">
                    {superseded
                      ? 'Superseded by the verified renewal; no longer in force.'
                      : validityLabel(validity)}
                  </p>

                  {predecessor && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-2">
                      <History className="h-3 w-3" aria-hidden="true" />
                      Renewal of {predecessor.id}: {predecessor.title}
                    </p>
                  )}

                  {doc.renewalNote && (
                    <p className="mt-1 text-xs leading-snug text-danger">{doc.renewalNote}</p>
                  )}

                  {awaitingVerification && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                      <FileClock className="h-3 w-3" aria-hidden="true" />
                      Renewal evidence awaiting officer verification
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs text-ink-2">
                    <span>Uploaded {formatDisplayDate(doc.uploadDate)}</span>
                    <span className="text-right">Expires {formatDisplayDate(doc.expiryDate)}</span>
                    <span>
                      {doc.fileSize} {doc.fileType}
                    </span>
                    <span className="truncate text-right" title={doc.verifiedBy ?? undefined}>
                      {doc.verifiedBy ? `Verified by ${doc.verifiedBy}` : 'Awaiting verification'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => setPreviewDoc(doc)}
                  >
                    Preview
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={() => handleDownload(doc)}
                  >
                    Download
                  </Button>

                  <span className="flex-1" />

                  {requestable && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      onClick={() => requestDocumentRenewal(doc.id)}
                    >
                      Request renewal
                    </Button>
                  )}

                  {renewable && (
                    <Button
                      size="sm"
                      icon={<Paperclip className="h-3.5 w-3.5" />}
                      onClick={() => openRenewal(doc)}
                    >
                      {doc.renewalStatus === 'Rejected' ? 'Resubmit renewal' : 'Submit renewal'}
                    </Button>
                  )}

                  {canVerify && doc.status === 'Pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        onClick={() => verifyDocument(doc.id)}
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setRejectReason('');
                          setRejectTarget(doc);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload verification dossier"
        subtitle="Record the statutory document, its validity and the institution it belongs to."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="upload-document-form">
              Upload document
            </Button>
          </>
        }
      >
        <form id="upload-document-form" onSubmit={handleUploadSubmit} className="space-y-4">
          <Field label="Document type" htmlFor="doc-type" required>
            <Select
              id="doc-type"
              value={docType}
              onChange={(event) => handleTypeChange(event.target.value)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label} / {type.category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Document title" htmlFor="doc-title" required>
            <Input
              id="doc-title"
              type="text"
              required
              value={docTitle}
              onChange={(event) => setDocTitle(event.target.value)}
              placeholder="Registered lease deed for the main campus"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Issued on" htmlFor="doc-issued" required>
              <Input
                id="doc-issued"
                type="date"
                required
                value={docIssuedOn}
                onChange={(event) => handleIssueChange(event.target.value)}
              />
            </Field>

            <Field label="Valid until" htmlFor="doc-expiry" required>
              <Input
                id="doc-expiry"
                type="date"
                required
                value={docExpiryDate}
                onChange={(event) => {
                  setDocExpiryDate(event.target.value);
                  setExpiryTouched(true);
                }}
              />
            </Field>
          </div>

          <Field label="Institution" htmlFor="doc-institution" required>
            {scopedInstitutes.length > 1 ? (
              <Select
                id="doc-institution"
                value={selectedInstitute?.id ?? ''}
                onChange={(event) => setDocInstId(event.target.value)}
              >
                {scopedInstitutes.map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name} / {institute.region} Region
                  </option>
                ))}
              </Select>
            ) : (
              <div className="rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">
                {selectedInstitute
                  ? `${selectedInstitute.name} / ${selectedInstitute.region} Region`
                  : 'No institution linked to this account'}
              </div>
            )}
          </Field>

          <Field label="Scanned copy" htmlFor="doc-file" hint="Metadata is recorded in demo mode.">
            <label
              htmlFor="doc-file"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-dashed border-line-strong bg-surface-2 px-4 py-3 transition-colors duration-150 hover:border-ink-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">
                    {docFile?.name ?? 'Choose a PDF or image'}
                  </div>
                  <div className="text-xs text-ink-2">
                    {docFile ? `${docFile.size} ${docFile.type}` : 'PDF, PNG or JPG'}
                  </div>
                </div>
              </div>
              <input
                id="doc-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setDocFile(file ? fileMetaFrom(file) : null);
                }}
              />
              <span className="shrink-0 text-xs font-semibold text-accent">Browse</span>
            </label>
          </Field>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(renewalDoc)}
        onClose={() => setRenewalDoc(null)}
        title="Submit renewal evidence"
        subtitle={
          renewalDoc
            ? `${renewalDoc.title}, currently valid until ${formatDisplayDate(renewalDoc.expiryDate)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewalDoc(null)}>
              Cancel
            </Button>
            <Button type="submit" form="renewal-document-form">
              Submit for verification
            </Button>
          </>
        }
      >
        {renewalDoc && (
          <form id="renewal-document-form" onSubmit={handleRenewalSubmit} className="space-y-4">
            <Field
              label="Renewed validity end date"
              htmlFor="renewal-expiry"
              required
              hint={`The renewed date must extend beyond ${formatDisplayDate(renewalDoc.expiryDate)}.`}
            >
              <Input
                id="renewal-expiry"
                type="date"
                required
                value={renewalExpiry}
                onChange={(event) => setRenewalExpiry(event.target.value)}
              />
            </Field>

            <Field
              label="Renewed certificate"
              htmlFor="renewal-file"
              hint="PDF or image. Metadata is recorded in demo mode."
            >
              <label
                htmlFor="renewal-file"
                className="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-dashed border-line-strong bg-surface-2 px-4 py-3 transition-colors duration-150 hover:border-ink-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {renewalFile?.name ?? 'Choose the renewed certificate'}
                    </div>
                    <div className="text-xs text-ink-2">
                      {renewalFile
                        ? `${renewalFile.size} ${renewalFile.type}`
                        : 'PDF, PNG or JPG'}
                    </div>
                  </div>
                </div>
                <input
                  id="renewal-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setRenewalFile(file ? fileMetaFrom(file) : null);
                  }}
                />
                <span className="shrink-0 text-xs font-semibold text-accent">Browse</span>
              </label>
            </Field>

            <Field
              label="Note to the verifying officer"
              htmlFor="renewal-note"
              hint="Optional. Reference number, issuing authority or clarification."
            >
              <Textarea
                id="renewal-note"
                value={renewalNote}
                onChange={(event) => setRenewalNote(event.target.value)}
                rows={2}
                placeholder="Reference number, issuing authority or clarification"
              />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject document"
        subtitle={rejectTarget ? `${rejectTarget.title}, ${rejectTarget.instituteName}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="reject-document-form"
              variant="danger"
            >
              Reject and notify
            </Button>
          </>
        }
      >
        {rejectTarget && (
          <form id="reject-document-form" onSubmit={handleRejectSubmit}>
            <Field label="Reason for rejection" htmlFor="reject-reason" required>
              <Textarea
                id="reject-reason"
                required
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={3}
                placeholder="Certificate expired before the submission date. Upload the current issue."
              />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `Document preview: ${previewDoc.title}` : 'Document preview'}
        subtitle={previewDoc ? `${previewDoc.instituteName}, ${previewDoc.category}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
              Close preview
            </Button>
            <Button
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                if (previewDoc) handleDownload(previewDoc);
                setPreviewDoc(null);
              }}
            >
              Download certified copy
            </Button>
          </>
        }
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-3 rounded-card bg-ink p-6 text-center text-white">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                <FileText className="h-8 w-8" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-white">{previewDoc.title}</h3>
              <p className="text-xs text-white/70">
                {previewDoc.instituteName}, valid until {formatDisplayDate(previewDoc.expiryDate)}
              </p>
              <Badge tone={statusTone(validityFor(previewDoc).tier)} size="md">
                {validityLabel(validityFor(previewDoc))}
              </Badge>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-control border border-line p-3">
                <dt className="text-xs text-ink-2">Document type</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {getDocumentType(previewDoc.documentTypeCode)?.label ?? previewDoc.category}
                </dd>
              </div>
              <div className="rounded-control border border-line p-3">
                <dt className="text-xs text-ink-2">Verification</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {previewDoc.verifiedBy ?? 'Pending officer verification'}
                </dd>
              </div>
              <div className="rounded-control border border-line p-3">
                <dt className="text-xs text-ink-2">Issued</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {formatDisplayDate(previewDoc.uploadDate)}
                </dd>
              </div>
              <div className="rounded-control border border-line p-3">
                <dt className="text-xs text-ink-2">Renewal chain</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {previewDoc.renewalOfId
                    ? `Renewal of ${previewDoc.renewalOfId}`
                    : successorOf(previewDoc.id)
                      ? `Superseded by ${successorOf(previewDoc.id)?.id}`
                      : previewDoc.renewalStatus
                        ? `Renewal ${previewDoc.renewalStatus.toLowerCase()}`
                        : 'No renewal linked'}
                </dd>
              </div>
            </dl>

            {previewDoc.renewalNote && (
              <div className="flex items-start gap-2 rounded-control border border-warning/20 bg-warning-soft p-3 text-xs text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{previewDoc.renewalNote}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

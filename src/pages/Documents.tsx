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
import { Modal } from '../components/common/Modal';
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

const TIER_STYLE: Record<string, string> = {
  Valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Expiring Soon': 'bg-amber-50 text-amber-700 border-amber-200',
  Critical: 'bg-orange-50 text-orange-700 border-orange-200',
  Expired: 'bg-rose-50 text-rose-700 border-rose-200'
};

const RENEWAL_STYLE: Record<string, string> = {
  Requested: 'bg-blue-50 text-blue-700 border-blue-200',
  Submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
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

  const summaryCards = [
    {
      label: 'Documents on record',
      value: summary.total,
      note: 'Across the scoped repository',
      filter: 'All' as ValidityFilter,
      accent: 'text-slate-900'
    },
    {
      label: 'Valid',
      value: summary.valid,
      note: 'No action required',
      filter: 'Valid' as ValidityFilter,
      accent: 'text-emerald-700'
    },
    {
      label: 'Expiring soon',
      value: summary.expiringSoon,
      note: '31 to 60 days',
      filter: 'Expiring soon' as ValidityFilter,
      accent: 'text-amber-700'
    },
    {
      label: 'Critical',
      value: summary.critical,
      note: '30 days or less',
      filter: 'Critical' as ValidityFilter,
      accent: 'text-orange-700'
    },
    {
      label: 'Expired',
      value: summary.expired,
      note: `${summary.actionable} need renewal`,
      filter: 'Expired' as ValidityFilter,
      accent: 'text-rose-700'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Central Documents Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Statutory validity, renewal chains and officer verification for every institutional record.
          </p>
        </div>

        {canUpload && (
          <button
            onClick={openUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload verification dossier</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setValidityFilter(card.filter)}
            className={`text-left bg-white rounded-2xl border p-4 shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              validityFilter === card.filter ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500">{card.label}</div>
            <div className={`text-2xl font-black mt-1 ${card.accent}`}>{card.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{card.note}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or institution"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="w-full md:w-60">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">All categories</option>
              <option value="Land & Building">Land & Building</option>
              <option value="Fire Safety">Fire Safety</option>
              <option value="AICTE Approvals">AICTE Approvals</option>
              <option value="Affiliation">Affiliation</option>
              <option value="Audit & Finance">Audit & Finance</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setValidityFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                validityFilter === filter
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter} ({countFor(filter)})
            </button>
          ))}
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h2 className="text-sm font-bold text-slate-700 mt-3">No documents match this view</h2>
          <p className="text-xs text-slate-500 mt-1">
            Clear the search or choose another validity filter to see the repository.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
              setValidityFilter('All');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs card-interactive flex flex-col justify-between transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {doc.category}
                    </span>
                    <StatusBadge status={doc.status} size="sm" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug break-words">
                    {doc.title}
                  </h3>

                  <div className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doc.instituteName}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {!superseded && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                          TIER_STYLE[validity.tier] ?? TIER_STYLE.Valid
                        }`}
                      >
                        <CalendarDays className="w-3 h-3" />
                        {TIER_LABEL[validity.tier] ?? 'Valid'}
                      </span>
                    )}
                    {doc.renewalStatus && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                          RENEWAL_STYLE[doc.renewalStatus]
                        }`}
                      >
                        Renewal {doc.renewalStatus.toLowerCase()}
                      </span>
                    )}
                    {superseded && successor && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                        Superseded by {successor.id}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    {superseded ? 'Superseded by the verified renewal; no longer in force.' : validityLabel(validity)}
                  </p>

                  {predecessor && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Renewal of {predecessor.id} · {predecessor.title}
                    </p>
                  )}

                  {doc.renewalNote && (
                    <p className="text-[11px] text-rose-600 mt-1 leading-snug">{doc.renewalNote}</p>
                  )}

                  {awaitingVerification && (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                      <FileClock className="w-3 h-3" />
                      Renewal evidence awaiting officer verification
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <span>Uploaded {formatDisplayDate(doc.uploadDate)}</span>
                    <span className="text-right">
                      Expires {formatDisplayDate(doc.expiryDate)}
                    </span>
                    <span>{doc.fileSize} · {doc.fileType}</span>
                    <span className="text-right truncate" title={doc.verifiedBy ?? undefined}>
                      {doc.verifiedBy ? `Verified by ${doc.verifiedBy}` : 'Awaiting verification'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-1 py-0.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-1 py-0.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <span className="flex-1" />

                  {requestable && (
                    <button
                      onClick={() => requestDocumentRenewal(doc.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Request renewal
                    </button>
                  )}

                  {renewable && (
                    <button
                      onClick={() => openRenewal(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      {doc.renewalStatus === 'Rejected' ? 'Resubmit renewal' : 'Submit renewal'}
                    </button>
                  )}

                  {canVerify && doc.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => verifyDocument(doc.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          setRejectReason('');
                          setRejectTarget(doc);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isUploadOpen && (
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload verification dossier"
          subtitle="Record the statutory document, its validity and the institution it belongs to."
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document type
              </label>
              <select
                value={docType}
                onChange={(event) => handleTypeChange(event.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label} · {type.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document title
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                placeholder="e.g. Registered lease deed for the main campus"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issued on
                </label>
                <input
                  type="date"
                  required
                  value={docIssuedOn}
                  onChange={(event) => handleIssueChange(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valid until
                </label>
                <input
                  type="date"
                  required
                  value={docExpiryDate}
                  onChange={(event) => {
                    setDocExpiryDate(event.target.value);
                    setExpiryTouched(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution
              </label>
              {scopedInstitutes.length > 1 ? (
                <select
                  value={selectedInstitute?.id ?? ''}
                  onChange={(event) => setDocInstId(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {scopedInstitutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} · {institute.region} Region
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                  {selectedInstitute
                    ? `${selectedInstitute.name} · ${selectedInstitute.region} Region`
                    : 'No institution linked to this account'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scanned copy
              </label>
              <label className="flex items-center justify-between gap-3 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 bg-slate-50/60 hover:border-blue-400 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate">
                      {docFile?.name ?? 'Choose a PDF or image'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {docFile ? `${docFile.size} · ${docFile.type}` : 'Metadata is recorded in demo mode'}
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setDocFile(file ? fileMetaFrom(file) : null);
                  }}
                />
                <span className="text-[11px] font-semibold text-blue-600 shrink-0">Browse</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Upload document
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renewalDoc && (
        <Modal
          isOpen={Boolean(renewalDoc)}
          onClose={() => setRenewalDoc(null)}
          title="Submit renewal evidence"
          subtitle={`${renewalDoc.title} · currently valid until ${formatDisplayDate(renewalDoc.expiryDate)}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleRenewalSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Renewed validity end date
              </label>
              <input
                type="date"
                required
                value={renewalExpiry}
                onChange={(event) => setRenewalExpiry(event.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The renewed date must extend beyond {formatDisplayDate(renewalDoc.expiryDate)}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Renewed certificate
              </label>
              <label className="flex items-center justify-between gap-3 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 bg-slate-50/60 hover:border-blue-400 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate">
                      {renewalFile?.name ?? 'Choose the renewed certificate'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {renewalFile ? `${renewalFile.size} · ${renewalFile.type}` : 'PDF or image, metadata recorded in demo mode'}
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setRenewalFile(file ? fileMetaFrom(file) : null);
                  }}
                />
                <span className="text-[11px] font-semibold text-blue-600 shrink-0">Browse</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Note to the verifying officer (optional)
              </label>
              <textarea
                value={renewalNote}
                onChange={(event) => setRenewalNote(event.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="Reference number, issuing authority or clarification"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRenewalDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Submit for verification
              </button>
            </div>
          </form>
        </Modal>
      )}

      {rejectTarget && (
        <Modal
          isOpen={Boolean(rejectTarget)}
          onClose={() => setRejectTarget(null)}
          title="Reject document"
          subtitle={`${rejectTarget.title} · ${rejectTarget.instituteName}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for rejection
              </label>
              <textarea
                required
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="e.g. Certificate expired before the submission date; upload the current issue."
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                Reject and notify
              </button>
            </div>
          </form>
        </Modal>
      )}

      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document preview · ${previewDoc.title}`}
          subtitle={`${previewDoc.instituteName} · ${previewDoc.category}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">{previewDoc.title}</h3>
              <p className="text-xs text-slate-300">
                {previewDoc.instituteName} · Valid until {formatDisplayDate(previewDoc.expiryDate)}
              </p>
              <span
                className={`text-[11px] px-3 py-1 rounded-full font-semibold border ${
                  TIER_STYLE[validityFor(previewDoc).tier] ?? TIER_STYLE.Valid
                }`}
              >
                {validityLabel(validityFor(previewDoc))}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 p-3">
                <dt className="text-[11px] text-slate-400">Document type</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {getDocumentType(previewDoc.documentTypeCode)?.label ?? previewDoc.category}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <dt className="text-[11px] text-slate-400">Verification</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {previewDoc.verifiedBy ?? 'Pending officer verification'}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <dt className="text-[11px] text-slate-400">Issued</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {formatDisplayDate(previewDoc.uploadDate)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <dt className="text-[11px] text-slate-400">Renewal chain</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
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
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{previewDoc.renewalNote}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                Close preview
              </button>
              <button
                onClick={() => {
                  handleDownload(previewDoc);
                  setPreviewDoc(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download certified copy</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

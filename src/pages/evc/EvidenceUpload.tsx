import React, { useRef, useState } from 'react';
import { Camera, ClipboardList, FileText, Image, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { fileNameFromKey, isFileUploadEnabled, uploadFile } from '../../services/fileStorage';
import { formatDisplayDate } from '../../utils/dates';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  Select
} from '../../components/ui';

export const EvidenceUpload: React.FC = () => {
  const { user } = useAuth();
  const { evcVisits, addVisitEvidence, removeVisitEvidence, showToast } = useApp();
  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const [visitId, setVisitId] = useState(assignedVisits[0]?.id ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The snapshot hydrates after mount in Postgres mode, so fall back to the first assigned visit.
  const visit =
    assignedVisits.find((item) => item.id === visitId) ?? assignedVisits[0];
  const evidenceFiles = visit?.evidenceFiles ?? [];
  const locked = Boolean(visit?.reportSubmitted);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !visit || locked) return;

    if (!isFileUploadEnabled()) {
      addVisitEvidence(visit.id, file.name);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file, 'evidence');
      addVisitEvidence(visit.id, uploaded.key);
      showToast(`${uploaded.fileName} attached to ${visit.id}.`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'The evidence file could not be uploaded.',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection evidence"
        description="Attach geotagged photographs, laboratory records and attendance audits to the inspection they support."
        meta={
          <>
            <Badge tone="info">EVC evidence repository</Badge>
            <span className="text-xs text-ink-2">Tamper-proof attachments</span>
          </>
        }
      />

      {assignedVisits.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No inspection visit assigned to you"
            description="Evidence can be attached once a committee visit is scheduled for your region."
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Evidence for visit" htmlFor="evidence-visit">
                <Select
                  id="evidence-visit"
                  value={visit?.id ?? ''}
                  onChange={(e) => setVisitId(e.target.value)}
                >
                  {assignedVisits.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}, {item.instituteName}
                      {item.date ? ` (${formatDisplayDate(item.date)})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-label text-ink-2 sm:pb-2.5">{evidenceFiles.length} files attached</p>
            </div>
          </Card>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={locked || isUploading}
            className={
              locked || isUploading
                ? 'w-full cursor-not-allowed rounded-card border-2 border-dashed border-line bg-surface p-8 text-center opacity-60'
                : 'w-full cursor-pointer rounded-card border-2 border-dashed border-line-strong bg-surface p-8 text-center transition-colors duration-150 hover:border-accent hover:bg-surface-2'
            }
          >
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Camera className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="block text-sm font-semibold text-ink">
              {isUploading ? 'Uploading evidence…' : 'Attach inspection photographs and evidence'}
            </span>
            <span className="mx-auto mt-1 block max-w-sm text-label text-ink-2">
              {locked
                ? 'The inspection report is on record, so evidence is locked for audit.'
                : 'Campus infrastructure photos, laboratory test rigs or signed biometric registers in JPG, PNG or PDF up to 25 MB.'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            aria-label="Attach inspection evidence"
            onChange={(event) => void handleUpload(event)}
          />

          <Card padded="none">
            <CardHeader
              title="Attached evidence"
              description={`${evidenceFiles.length} records held against ${visit?.id}`}
            />

            {evidenceFiles.length === 0 ? (
              <p className="px-5 py-6 text-label text-ink-2 sm:px-6">
                No evidence attached yet. Records added here are listed in the signed report.
              </p>
            ) : (
              <ul className="divide-y divide-line px-5 sm:px-6">
                {evidenceFiles.map((title) => (
                  <li key={title} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-2 text-ink-2">
                        {fileNameFromKey(title).toLowerCase().endsWith('.pdf') ? (
                          <FileText className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Image className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{fileNameFromKey(title)}</p>
                        <p className="text-label text-ink-2">Attached to {visit?.instituteName}</p>
                      </div>
                    </div>

                    <IconButton
                      label={`Remove ${fileNameFromKey(title)}`}
                      size="sm"
                      disabled={locked}
                      className="hover:text-danger"
                      onClick={() => visit && removeVisitEvidence(visit.id, title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

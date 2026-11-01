import React, { useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button, Field, Input, Select } from '../ui';
import { useApp } from '../../context/AppContext';
import { Region } from '../../types';

export const UploadComplianceModal: React.FC = () => {
  const { activeModal, setActiveModal, institutes, uploadCompliance } = useApp();

  const [selectedInstId, setSelectedInstId] = useState(institutes[0]?.id || '');
  const [category, setCategory] = useState<any>('Compliance Submissions');
  const [title, setTitle] = useState('Faculty Cadre Ratio & Form 16 Affidavit');
  const [dueDate, setDueDate] = useState('2025-11-20');
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [fileName, setFileName] = useState('Affidavit_Stamped_2025.pdf');

  const selectedInst = institutes.find((i) => i.id === selectedInstId) || institutes[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;

    uploadCompliance({
      title,
      category,
      instituteId: selectedInst.id,
      instituteName: selectedInst.name,
      region: selectedInst.region as Region,
      status: 'Submitted',
      dueDate,
      submissionDate: new Date().toISOString().split('T')[0],
      documentRef: fileName,
      urgency
    });

    setActiveModal(null);
  };

  return (
    <Modal
      isOpen={activeModal === 'upload-compliance'}
      onClose={() => setActiveModal(null)}
      title="Upload compliance and undertaking"
      subtitle="Submit regulatory compliance dossiers and legal affidavits"
      footer={
        <>
          <Button variant="secondary" onClick={() => setActiveModal(null)}>
            Cancel
          </Button>
          <Button type="submit" form="compliance-upload-form">
            Submit compliance dossier
          </Button>
        </>
      }
    >
      <form id="compliance-upload-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Institution" htmlFor="compliance-institute">
          <Select
            id="compliance-institute"
            value={selectedInstId}
            onChange={(e) => setSelectedInstId(e.target.value)}
          >
            {institutes.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.region} Region)
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Compliance category" htmlFor="compliance-category">
            <Select
              id="compliance-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Compliance Submissions">Compliance Submissions</option>
              <option value="Institutional Undertakings">Institutional Undertakings</option>
              <option value="Lease Documents">Lease Documents</option>
              <option value="Valid Documents">Valid Documents</option>
            </Select>
          </Field>

          <Field label="Urgency level" htmlFor="compliance-urgency">
            <Select
              id="compliance-urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as any)}
            >
              <option value="low">Standard / Low</option>
              <option value="medium">Medium Urgency</option>
              <option value="high">High (Urgent Escalation)</option>
            </Select>
          </Field>
        </div>

        <Field
          label="Document description or title"
          htmlFor="compliance-title"
          required
        >
          <Input
            id="compliance-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-label font-medium text-ink">
            PDF or stamped document
          </span>
          <div className="rounded-card border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center">
            <UploadCloud
              className="mx-auto h-7 w-7 text-accent"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-ink">
              Drag and drop a document or <span className="text-accent">browse files</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-2">Digitally signed PDF accepted, up to 25 MB</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-surface px-3 py-1.5 text-label font-medium text-ink-2">
              <FileText className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
              {fileName}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
};

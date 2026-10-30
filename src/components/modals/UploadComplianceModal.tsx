import React, { useState } from 'react';
import { UploadCloud, FileText, Building } from 'lucide-react';
import { Modal } from '../common/Modal';
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
      title="Upload Compliance & Undertaking"
      subtitle="Submit regulatory compliance dossiers and legal affidavits"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Institute */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Institution
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.region} Region)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Compliance Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              <option value="Compliance Submissions">Compliance Submissions</option>
              <option value="Institutional Undertakings">Institutional Undertakings</option>
              <option value="Lease Documents">Lease Documents</option>
              <option value="Valid Documents">Valid Documents</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Urgency Level
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              <option value="low">Standard / Low</option>
              <option value="medium">Medium Urgency</option>
              <option value="high">High (Urgent Escalation)</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Compliance Document Description / Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* File Upload Dropzone Simulation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Upload PDF / Stamped Document
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-colors">
            <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700">
              Drag & drop document or <span className="text-blue-600">browse files</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports digitally signed PDF, max 25MB
            </p>
            <div className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-2xs">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>{fileName}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            Submit Compliance Dossier
          </button>
        </div>
      </form>
    </Modal>
  );
};

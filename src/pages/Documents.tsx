import React, { useState } from 'react';
import {
  Upload,
  Search,
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterDocumentsForUser } from '../services/rbacService';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { DocumentItem } from '../types';

export const Documents: React.FC = () => {
  const { documents, uploadDocument, showToast } = useApp();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // New doc form
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<any>('Land & Building');
  const [docInstName, setDocInstName] = useState('ABC Institute of Tech');

  const scopedDocs = React.useMemo(() => {
    return filterDocumentsForUser(documents, user);
  }, [documents, user]);

  const filteredDocs = scopedDocs.filter((doc: DocumentItem) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.instituteName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;

    uploadDocument({
      title: docTitle,
      category: docCategory,
      instituteName: docInstName,
      instituteId: 'INST-101',
      region: 'Northern',
      uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      expiryDate: '2028-06-30',
      status: 'Pending',
      fileSize: '3.4 MB',
      fileType: 'PDF'
    });

    setDocTitle('');
    setIsUploadOpen(false);
  };

  const handleDownload = (doc: DocumentItem) => {
    const textContent = `AICTE VERIFIED REPOSITORY DOCUMENT\n\nTitle: ${doc.title}\nInstitution: ${doc.instituteName}\nCategory: ${doc.category}\nStatus: ${doc.status}\nUploaded: ${doc.uploadDate}\nValidity: ${doc.expiryDate}\n\nDigitally signed by AICTE National Portal.`;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Central Documents Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Archival repository for land deeds, building blueprints, fire clearances, and university affiliations.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Verification Dossier</span>
        </button>
      </div>

      {/* Filter and Category Pills */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by title or institution name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="w-full md:w-60">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              <option value="Land & Building">Land & Building</option>
              <option value="Fire Safety">Fire Safety</option>
              <option value="AICTE Approvals">AICTE Approvals</option>
              <option value="Affiliation">Affiliation</option>
              <option value="Audit & Finance">Audit & Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc: DocumentItem) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs card-interactive flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  {doc.category}
                </span>
                <StatusBadge status={doc.status} size="sm" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {doc.title}
              </h3>

              <div className="text-xs text-slate-600 font-medium mt-1">
                {doc.instituteName}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Uploaded: {doc.uploadDate}</span>
                <span>Size: {doc.fileSize}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setPreviewDoc(doc)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-blue-600 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => handleDownload(doc)}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white active:scale-95 rounded-lg text-xs font-semibold text-slate-700 transition-all duration-150 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload New Document Dossier"
          subtitle="Submit authentic scanned statutory approvals and government certifications"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Master Structural Stability Certificate"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                >
                  <option value="Land & Building">Land & Building</option>
                  <option value="Fire Safety">Fire Safety</option>
                  <option value="AICTE Approvals">AICTE Approvals</option>
                  <option value="Affiliation">Affiliation</option>
                  <option value="Audit & Finance">Audit & Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Institution
                </label>
                <input
                  type="text"
                  required
                  value={docInstName}
                  onChange={(e) => setDocInstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Upload File
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview — ${previewDoc.title}`}
          subtitle={`${previewDoc.instituteName} • ${previewDoc.category}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">{previewDoc.title}</h3>
              <p className="text-xs text-slate-300">
                {previewDoc.instituteName} • Valid till {previewDoc.expiryDate}
              </p>
              <span className="text-[11px] px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-semibold">
                AICTE Digitally Verified File • {previewDoc.fileSize}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  handleDownload(previewDoc);
                  setPreviewDoc(null);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Certified Copy</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

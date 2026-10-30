import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image,
  CheckCircle2,
  Trash2,
  Camera,
  MapPin,
  Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EvidenceUpload: React.FC = () => {
  const { showToast } = useApp();

  const [evidenceFiles, setEvidenceFiles] = useState([
    {
      id: 'EV-1',
      title: 'Computer_Centre_Lab_A_Geotagged.jpg',
      size: '3.4 MB',
      type: 'image',
      timestamp: '30 Oct 2026, 10:15 AM',
      geotag: '26.4499° N, 80.3319° E (Kanpur)',
      category: 'Computing Lab'
    },
    {
      id: 'EV-2',
      title: 'Fire_Hydrant_And_Safety_Inspection.jpg',
      size: '2.8 MB',
      type: 'image',
      timestamp: '30 Oct 2026, 11:20 AM',
      geotag: '26.4499° N, 80.3319° E (Kanpur)',
      category: 'Fire Safety'
    },
    {
      id: 'EV-3',
      title: 'Faculty_Biometric_Attendance_Verification.pdf',
      size: '1.2 MB',
      type: 'pdf',
      timestamp: '30 Oct 2026, 12:05 PM',
      geotag: 'Administrative Block',
      category: 'Faculty Audit'
    }
  ]);

  const handleDelete = (id: string) => {
    setEvidenceFiles(evidenceFiles.filter((f) => f.id !== id));
    showToast('Evidence file removed', 'info');
  };

  const handleSimulatedUpload = () => {
    const newFile = {
      id: `EV-${Date.now().toString().slice(-4)}`,
      title: `EVC_Campus_Inspection_${Date.now().toString().slice(-3)}.jpg`,
      size: '4.1 MB',
      type: 'image',
      timestamp: 'Just now',
      geotag: '26.4512° N, 80.3301° E (Campus Block B)',
      category: 'Instructional Area'
    };
    setEvidenceFiles([newFile, ...evidenceFiles]);
    showToast('Geotagged inspection photo uploaded and hashed', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            EVC Evidence Repository
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">Tamper-Proof Audit Attachments</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Inspection Evidence & Geotagged Records
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Attach geotagged photographs, laboratory videos, and physical attendance audits to support EVC inspection recommendations.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        onClick={handleSimulatedUpload}
        className="bg-white rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 p-8 text-center cursor-pointer transition-all hover:bg-amber-50/20 group shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
          <Camera className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          Upload Geotagged Inspection Photographs & Evidence
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Click to attach campus infrastructure photos, laboratory test rigs, or signed biometric registers (JPG, PNG, PDF up to 25 MB).
        </p>
      </div>

      {/* Uploaded Evidence List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Attached Evidence ({evidenceFiles.length} records)</span>
          <span className="text-xs text-slate-400 font-normal">SHA-256 Checksum Verified</span>
        </h2>

        <div className="space-y-2.5">
          {evidenceFiles.map((f) => (
            <div
              key={f.id}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  {f.type === 'image' ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{f.title}</div>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-3 mt-0.5">
                    <span>{f.size}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>{f.geotag}</span>
                    </span>
                    <span>•</span>
                    <span>{f.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {f.category}
                </span>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import {
  Upload,
  Search,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterComplianceForUser } from '../services/rbacService';
import { StatusBadge } from '../components/common/StatusBadge';
import { complianceSummaryData } from '../data/initialData';
import { ComplianceRecord } from '../types';

export const Compliance: React.FC = () => {
  const { complianceRecords, setActiveModal, verifyCompliance } = useApp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [search, setSearch] = useState('');

  const scopedRecords = React.useMemo(() => {
    return filterComplianceForUser(complianceRecords, user);
  }, [complianceRecords, user]);

  const filteredRecords = scopedRecords.filter((rec: ComplianceRecord) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(search.toLowerCase()) ||
      rec.instituteName.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Urgent' && (rec.status === 'Critical' || rec.urgency === 'high')) ||
      (activeTab === 'Pending' && rec.status === 'Pending') ||
      (activeTab === 'Verified' && rec.status === 'Verified');

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Undertakings & Statutory Compliance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor lease deed expirations, mandatory affidavits, fire NOCs, and barrier-free declarations.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('upload-compliance')}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Compliance Dossier</span>
        </button>
      </div>

      {/* 5 Cards Matching Dashboard Widget Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {complianceSummaryData.map((item: any) => (
          <div
            key={item.label}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: `${item.color}15`, color: item.color }}
              >
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-xl font-black text-slate-900">
                {item.count.toLocaleString()}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-3 line-clamp-2 leading-tight">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search undertakings by institution or document..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-end sm:self-auto">
          {['All', 'Urgent', 'Pending', 'Verified'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Compliance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Undertaking / Document Title</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No compliance records found for the selected view.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec: ComplianceRecord) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-600">{rec.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs">
                      {rec.title}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {rec.instituteName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{rec.category}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{rec.dueDate}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={rec.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {rec.status !== 'Verified' ? (
                        <button
                          onClick={() => verifyCompliance(rec.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Verify & Clear
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-xs inline-flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Complied
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

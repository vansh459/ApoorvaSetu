import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  CheckCircle2,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';

export const Reports: React.FC = () => {
  const { setActiveModal } = useApp();
  const [selectedYear, setSelectedYear] = useState('2025-26');

  const monthlyTrendData = [
    { month: 'Jun', submitted: 480, approved: 120 },
    { month: 'Jul', submitted: 890, approved: 340 },
    { month: 'Aug', submitted: 1420, approved: 780 },
    { month: 'Sep', submitted: 1840, approved: 1250 },
    { month: 'Oct', submitted: 852, approved: 471 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reports & Evidence Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Statistical analytics, regional clearance trends, compliance audit logs, and downloadable reports.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('generate-report')}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Official CSV Reports</span>
        </button>
      </div>

      {/* Top 3 Quick Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Applications Master Dataset</h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete records of all 5,482 applications across 7 regional jurisdictions.
            </p>
          </div>
          <button
            onClick={() => setActiveModal('generate-report')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate CSV</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Compliance & Lease Validity Audit</h3>
            <p className="text-xs text-slate-500 mt-1">
              Detailed tracking of lease expirations, fire certificates, and pending affidavits.
            </p>
          </div>
          <button
            onClick={() => setActiveModal('generate-report')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate CSV</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">EVC Inspection Clearance Summary</h3>
            <p className="text-xs text-slate-500 mt-1">
              Scheduled, pending and submitted inspection visit dockets with expert ratings.
            </p>
          </div>
          <button
            onClick={() => setActiveModal('generate-report')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate CSV</span>
          </button>
        </div>
      </div>

      {/* Monthly Approval Clearance Trends Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileBarChart className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Monthly Processing & Clearance Volume (AY 2026-27 Cycle)
            </h3>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border-0"
          >
            <option value="2025-26">Academic Year 2025-26</option>
            <option value="2026-27">Academic Year 2026-27</option>
          </select>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="submitted" name="Applications Received" fill="#93c5fd" radius={[6, 6, 0, 0]} />
              <Bar dataKey="approved" name="Approvals Ratified" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

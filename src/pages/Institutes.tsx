import React, { useState } from 'react';
import {
  Search,
  MapPin
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterInstitutesForUser } from '../services/rbacService';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { Institute } from '../types';

export const Institutes: React.FC = () => {
  const { institutes } = useApp();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeInst, setActiveInst] = useState<Institute | null>(null);

  const scopedInsts = React.useMemo(() => {
    return filterInstitutesForUser(institutes, user);
  }, [institutes, user]);

  const filteredInsts = scopedInsts.filter((inst: Institute) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.code.toLowerCase().includes(search.toLowerCase()) ||
      inst.city.toLowerCase().includes(search.toLowerCase()) ||
      inst.state.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = selectedRegion === 'All' || inst.region === selectedRegion;
    const matchesCategory = selectedCategory === 'All' || inst.category === selectedCategory;

    return matchesSearch && matchesRegion && matchesCategory;
  });

  const totalInstitutes = scopedInsts.length;
  const approvedCount = scopedInsts.filter((i: Institute) => i.status === 'Approved').length;
  const pendingCount = scopedInsts.filter((i: Institute) => i.status === 'Pending Review').length;
  const noticeCount = scopedInsts.filter((i: Institute) => i.status === 'Notice Issued').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Institutes Directory & Dossiers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Central registry of approved and applicant technical institutions across India.
        </p>
      </div>

      {/* Summary Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Total Institutes</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{totalInstitutes}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Across 7 Regions</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800">Approved & Active</div>
          <div className="text-2xl font-bold text-emerald-950 mt-0.5">{approvedCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Full Compliance</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800">Under Review / Scrutiny</div>
          <div className="text-2xl font-bold text-amber-950 mt-0.5">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">EVC / Scrutiny Stage</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="text-xs font-semibold text-rose-800">Notice Issued</div>
          <div className="text-2xl font-bold text-rose-950 mt-0.5">{noticeCount}</div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">Affidavit Required</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by institution name, permanent AICTE code, city or state..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Regions</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
            <option value="Eastern">Eastern</option>
            <option value="Western">Western</option>
            <option value="Central">Central</option>
            <option value="North Eastern">North Eastern</option>
          </select>
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Disciplines / Categories</option>
            <option value="Engineering & Technology">Engineering & Technology</option>
            <option value="Management">Management</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Architecture">Architecture</option>
            <option value="Polytechnic">Polytechnic</option>
          </select>
        </div>
      </div>

      {/* Institution Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInsts.map((inst: Institute) => (
          <div
            key={inst.id}
            onClick={() => setActiveInst(inst)}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  AICTE PID: {inst.code}
                </span>
                <StatusBadge status={inst.status} size="sm" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {inst.name}
              </h3>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {inst.city}, {inst.state} ({inst.region})
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Category:</span>
                  <div className="font-semibold text-slate-700 truncate">{inst.category}</div>
                </div>
                <div>
                  <span className="text-slate-400">Approved Seats:</span>
                  <div className="font-semibold text-slate-700">{inst.approvedSeats}</div>
                </div>
              </div>
            </div>

            {/* Bottom Compliance Score Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Compliance Health</span>
                <span className="font-bold text-slate-800">{inst.complianceScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${inst.complianceScore}%`,
                    backgroundColor:
                      inst.complianceScore >= 90
                        ? '#10b981'
                        : inst.complianceScore >= 75
                        ? '#f59e0b'
                        : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Institute Detail Modal */}
      {activeInst && (
        <Modal
          isOpen={!!activeInst}
          onClose={() => setActiveInst(null)}
          title={activeInst.name}
          subtitle={`Permanent ID: ${activeInst.code} • Established ${activeInst.establishedYear}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400">Head of Institution / Principal:</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">{activeInst.principalName}</div>
              </div>
              <div>
                <span className="text-slate-400">Jurisdiction & Region:</span>
                <div className="font-semibold text-slate-800 mt-0.5">{activeInst.region} Regional Office</div>
              </div>
              <div>
                <span className="text-slate-400">Official Email:</span>
                <div className="font-semibold text-blue-600 mt-0.5">{activeInst.email}</div>
              </div>
              <div>
                <span className="text-slate-400">Contact Number:</span>
                <div className="font-semibold text-slate-800 mt-0.5">{activeInst.phone}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400">Registered Campus Address:</span>
                <div className="font-medium text-slate-700 mt-0.5">{activeInst.address}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="text-lg font-black text-blue-700">{activeInst.approvedSeats}</div>
                <div className="text-[11px] font-medium text-slate-600">Annual Student Intake</div>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="text-lg font-black text-emerald-700">{activeInst.accreditedPrograms}</div>
                <div className="text-[11px] font-medium text-slate-600">NBA Accredited Courses</div>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                <div className="text-lg font-black text-purple-700">{activeInst.complianceScore}%</div>
                <div className="text-[11px] font-medium text-slate-600">Compliance Rating</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveInst(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

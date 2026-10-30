import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowUpDown,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Region } from '../types';

export const Applications: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get('stage') || 'All';
  const initialStatus = searchParams.get('status') || 'All';
  const initialRegion = searchParams.get('region') || 'All';

  const {
    applications,
    setSelectedApplication,
    setActiveModal,
    addNewApplication
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(initialRegion);
  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sortField, setSortField] = useState<'id' | 'instituteName' | 'lastUpdated'>('lastUpdated');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // New application quick form state
  const [isCreating, setIsCreating] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newRegion, setNewRegion] = useState<Region>('Northern');
  const [newType, setNewType] = useState('Extension of Approval (EoA)');
  const [newIntake, setNewIntake] = useState(300);

  const filteredApps = useMemo(() => {
    return applications
      .filter((app) => {
        const matchesSearch =
          app.id.toLowerCase().includes(search.toLowerCase()) ||
          app.instituteName.toLowerCase().includes(search.toLowerCase()) ||
          app.type.toLowerCase().includes(search.toLowerCase());

        const matchesRegion = selectedRegion === 'All' || app.region === selectedRegion;
        const matchesStage = selectedStage === 'All' || app.stage === selectedStage;
        const matchesStatus = selectedStatus === 'All' || app.status === selectedStatus;

        return matchesSearch && matchesRegion && matchesStage && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (sortAsc) {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [applications, search, selectedRegion, selectedStage, selectedStatus, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredApps.length / pageSize) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName) return;
    addNewApplication({
      instituteName: newInstName,
      region: newRegion,
      type: newType,
      intakeProposed: newIntake
    });
    setNewInstName('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Applications Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full repository of institutional applications, approval stages, scrutiny, and approvals.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* New Application Inline Modal/Card */}
      {isCreating && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">
              Register New Application for AY 2026-27
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Institution Name
              </label>
              <input
                type="text"
                required
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
                placeholder="e.g. Apex Institute of Technology"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Region
              </label>
              <select
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value as Region)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Northern">Northern</option>
                <option value="Southern">Southern</option>
                <option value="Eastern">Eastern</option>
                <option value="Western">Western</option>
                <option value="Central">Central</option>
                <option value="North Eastern">North Eastern</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Application Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
                <option value="New Technical Campus">New Technical Campus</option>
                <option value="Increase in Intake">Increase in Intake</option>
                <option value="New Course Introduction">New Course Introduction</option>
              </select>
            </div>

            <div className="sm:col-span-4 flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Proposed Intake: <input type="number" value={newIntake} onChange={(e) => setNewIntake(Number(e.target.value))} className="w-20 px-2 py-1 bg-slate-50 border rounded-md" />
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Application ID, Institute Name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-medium"
            />
          </div>

          {/* Region dropdown */}
          <div className="w-full md:w-44">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
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

          {/* Stage dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="All">All Stages</option>
              <option value="Submitted">Submitted</option>
              <option value="Scrutiny / Re-scrutiny">Scrutiny / Re-scrutiny</option>
              <option value="Expert Visit Committee (EVC)">Expert Visit Committee (EVC)</option>
              <option value="SAC / SHC">SAC / SHC</option>
              <option value="Approval (Subject to Undertaking)">Approval (Subject to Undertaking)</option>
              <option value="Final Approval">Final Approval</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div className="w-full md:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Action Required">Action Required</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {(selectedRegion !== 'All' || selectedStage !== 'All' || selectedStatus !== 'All' || search) && (
            <button
              onClick={() => {
                setSelectedRegion('All');
                setSelectedStage('All');
                setSelectedStatus('All');
                setSearch('');
              }}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <span className="font-bold text-slate-800">{filteredApps.length}</span> applications
          </span>
          <div className="flex items-center space-x-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                setSortField('lastUpdated');
                setSortAsc(!sortAsc);
              }}
              className="font-semibold text-blue-600 flex items-center space-x-0.5 hover:underline cursor-pointer"
            >
              <span>Date</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Region</th>
                <th className="py-3.5 px-4">Current Stage</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No applications match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-blue-600">
                      {app.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div>{app.instituteName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Intake: {app.intakeProposed} seats
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {app.type}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {app.region}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {app.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {app.lastUpdated}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedApplication(app);
                          setActiveModal('app-detail');
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>

            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-40 font-medium cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-md text-xs font-semibold cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-40 font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

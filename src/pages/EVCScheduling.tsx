import React, { useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Users,
  XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { EVCVisit } from '../types';

export const EVCScheduling: React.FC = () => {
  const { evcVisits, setActiveModal, cancelEVC, rescheduleEVC, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [newDateInput, setNewDateInput] = useState('2025-11-20');

  const filteredVisits = evcVisits.filter((v: EVCVisit) => {
    const matchesSearch =
      v.instituteName.toLowerCase().includes(search.toLowerCase()) ||
      v.assignedCommittee.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = regionFilter === 'All' || v.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const scheduledCount = evcVisits.filter((v: EVCVisit) => v.status === 'Scheduled').length;
  const pendingCount = evcVisits.filter((v: EVCVisit) => v.status === 'Pending').length;
  const completedCount = evcVisits.filter((v: EVCVisit) => v.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Expert Visit Committee (EVC) Scheduling
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate physical and hybrid inspection committees, verify infrastructure and labs.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('schedule-evc')}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New EVC Visit</span>
        </button>
      </div>

      {/* Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Total Inspections</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{evcVisits.length}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Constituted Teams</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800">Confirmed / Scheduled</div>
          <div className="text-2xl font-bold text-emerald-950 mt-0.5">{scheduledCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Ready for on-site</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800">Pending Constitution</div>
          <div className="text-2xl font-bold text-amber-950 mt-0.5">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Awaiting Experts</div>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-2xs">
          <div className="text-xs font-semibold text-blue-800">Completed Reports</div>
          <div className="text-2xl font-bold text-blue-950 mt-0.5">{completedCount}</div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">Submitted to Council</div>
        </div>
      </div>

      {/* Toolbar & View Mode Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institute name or committee..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="w-44">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
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
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Calendar / Schedule
          </button>
        </div>
      </div>

      {/* Reschedule inline dialog */}
      {rescheduleTargetId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div>
            <h4 className="text-xs font-bold text-amber-900">
              Reschedule EVC Visit ID: {rescheduleTargetId}
            </h4>
            <p className="text-[11px] text-amber-700">
              Select new date for on-site visit and re-notify committee members.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={newDateInput}
              onChange={(e) => setNewDateInput(e.target.value)}
              className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold"
            />
            <button
              onClick={() => {
                rescheduleEVC(rescheduleTargetId, newDateInput);
                setRescheduleTargetId(null);
              }}
              className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer"
            >
              Update Date
            </button>
            <button
              onClick={() => setRescheduleTargetId(null)}
              className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-amber-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Visits View */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredVisits.map((visit: EVCVisit) => (
            <div
              key={visit.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Date + Info */}
              <div className="flex items-start space-x-4">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-center shrink-0">
                  <span className="text-lg font-black text-blue-900 leading-none">
                    {visit.displayDate.day}
                  </span>
                  <span className="text-xs font-bold uppercase text-blue-600 mt-1 leading-none">
                    {visit.displayDate.month}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {visit.instituteName}
                    </h3>
                    <StatusBadge status={visit.status} size="sm" />
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {visit.mode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{visit.stateRegion}</span>
                  </p>

                  <div className="text-xs text-slate-700 flex items-center space-x-1.5 pt-1">
                    <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-600">Assigned Committee:</span>
                    <span>{visit.assignedCommittee}</span>
                  </div>
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center space-x-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                <button
                  onClick={() => {
                    setRescheduleTargetId(visit.id);
                    setNewDateInput(visit.date);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Reschedule
                </button>

                {visit.status !== 'Completed' && (
                  <button
                    onClick={() => {
                      showToast(`Inspection report verified for ${visit.instituteName}!`, 'success');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    Mark Done
                  </button>
                )}

                {visit.status !== 'Cancelled' && (
                  <button
                    onClick={() => cancelEVC(visit.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Cancel Visit"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar Schedule Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((visit: EVCVisit) => (
            <div
              key={visit.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {visit.date}
                  </span>
                  <StatusBadge status={visit.status} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-900">{visit.instituteName}</h3>
                <p className="text-xs text-slate-500 mt-1">{visit.stateRegion}</p>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Committee:</div>
                  <div className="text-slate-600 text-[11px]">{visit.assignedCommittee}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-100">
                <span className="text-slate-400 font-medium">Mode: {visit.mode}</span>
                <button
                  onClick={() => setRescheduleTargetId(visit.id)}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Change Date
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

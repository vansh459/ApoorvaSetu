import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';

export const UpcomingEVCList: React.FC = () => {
  const navigate = useNavigate();
  const { evcVisits, setActiveModal } = useApp();

  const displayVisits = evcVisits.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">
            Upcoming EVC Visits
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveModal('schedule-evc')}
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Schedule New EVC"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/evc-scheduling')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            View All
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 my-auto">
        {displayVisits.map((visit) => (
          <div
            key={visit.id}
            onClick={() => navigate('/evc-scheduling')}
            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl cursor-pointer transition-colors"
          >
            {/* Left: Date box + Info */}
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 text-center shrink-0">
                <span className="text-sm font-black text-slate-900 leading-none">
                  {visit.displayDate.day}
                </span>
                <span className="text-[10px] font-semibold uppercase text-slate-500 mt-0.5 leading-none">
                  {visit.displayDate.month}
                </span>
              </div>

              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {visit.instituteName}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {visit.stateRegion}
                </p>
              </div>
            </div>

            {/* Right: Status badge */}
            <div className="shrink-0 ml-2">
              <StatusBadge status={visit.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

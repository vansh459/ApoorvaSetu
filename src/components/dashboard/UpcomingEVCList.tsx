import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UpcomingEVCList: React.FC = () => {
  const navigate = useNavigate();
  const { evcVisits } = useApp();

  const displayVisits = evcVisits.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center justify-between mb-3.5 shrink-0">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
            Upcoming EVC Visits
          </h2>
        </div>
        <button
          onClick={() => navigate('/evc-scheduling')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer whitespace-nowrap shrink-0 ml-2"
        >
          View All
        </button>
      </div>

      {/* Visits List with full, complete institute and region text */}
      <div className="space-y-3 my-auto min-w-0">
        {displayVisits.map((visit) => (
          <div
            key={visit.id}
            onClick={() => navigate('/evc-scheduling')}
            className="flex items-center justify-between cursor-pointer hover:bg-slate-50/70 p-1 rounded-xl transition-colors min-w-0"
          >
            {/* Left: Date Box + Details */}
            <div className="flex items-center space-x-2.5 min-w-0 mr-2 flex-1">
              <div className="flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-50 border border-slate-200/80 text-center shrink-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-none">
                  {visit.displayDate.day}
                </span>
                <span className="text-[9px] font-medium text-slate-500 mt-0.5 leading-none">
                  {visit.displayDate.month}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 leading-tight whitespace-nowrap">
                  {visit.instituteName}
                </h4>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5 whitespace-nowrap">
                  {visit.stateRegion}
                </p>
              </div>
            </div>

            {/* Right: Soft Status Pill */}
            <div className="shrink-0">
              <span
                className={`inline-block text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                  visit.status.toLowerCase() === 'pending'
                    ? 'bg-[#fef3c7] text-[#b45309]'
                    : 'bg-[#dcfce7] text-[#15803d]'
                }`}
              >
                {visit.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

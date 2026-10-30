import React from 'react';
import { MapPin, Mail, Phone } from 'lucide-react';
import { regionalOffices } from '../data/initialData';
import { RegionalOffice } from '../types';

export const RegionsOfficials: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Regional Offices & Jurisdiction Officials
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Directory of AICTE Regional Offices (ROs), zonal jurisdictions, and appointed Regional Officers.
        </p>
      </div>

      {/* Grid of Regional Offices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {regionalOffices.map((office: RegionalOffice) => (
          <div
            key={office.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {office.region} Region
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {office.headquarters}
                </span>
              </div>

              {/* Officer details */}
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {office.officerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{office.officerName}</h3>
                  <p className="text-xs text-slate-500 font-medium">{office.designation}</p>
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-blue-600 font-medium truncate">{office.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{office.phone}</span>
                </div>
                <div className="flex items-start space-x-2 pt-1 border-t border-slate-200/60">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-500 leading-tight">
                    HQ: {office.headquarters}
                  </span>
                </div>
              </div>

              {/* Jurisdiction States */}
              <div className="mt-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  States in Jurisdiction:
                </div>
                <div className="flex flex-wrap gap-1">
                  {office.jurisdiction.map((st: string) => (
                    <span
                      key={st}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium"
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Workload Metrics */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-xl">
                <div className="font-bold text-slate-800 text-sm">{office.totalInstitutes}</div>
                <div className="text-[10px] text-slate-400">Total Institutes</div>
              </div>
              <div className="p-2 bg-amber-50 rounded-xl">
                <div className="font-bold text-amber-900 text-sm">{office.pendingApplications}</div>
                <div className="text-[10px] text-amber-700">Active Workflow</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

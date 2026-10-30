import React, { useState } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const InstitutionProfile: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useApp();

  const [name, setName] = useState('ABC Institute of Technology');
  const [code, setCode] = useState('1-102938475');
  const [pid, setPid] = useState('INST-101');
  const [category, setCategory] = useState('Engineering & Technology');
  const [estYear, setEstYear] = useState('2004');
  const [principalName, setPrincipalName] = useState('Dr. K. S. Murthy');
  const [email, setEmail] = useState('principal@abctech.edu.in');
  const [phone, setPhone] = useState('+91 512 2589001');
  const [address, setAddress] = useState('Sector 14, Institutional Area, Kalyanpur, Kanpur, Uttar Pradesh - 208016');
  const [approvedSeats, setApprovedSeats] = useState('480');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Institution profile updated and submitted for AICTE master directory synchronization', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Institution Profile
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">Permanent AICTE Directory</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Institutional Details & Governance Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Maintain verified campus information, permanent identification number (PID), and authorized institutional signatories.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Core Institution Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Primary Institutional Identification</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              AICTE Approved
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Institution Legal Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Permanent AICTE Institute ID (PID)
              </label>
              <input
                type="text"
                value={pid}
                disabled
                className="w-full px-3 py-2 bg-slate-100 text-slate-500 rounded-xl border border-slate-200 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                AICTE Application / Reference Code
              </label>
              <input
                type="text"
                value={code}
                disabled
                className="w-full px-3 py-2 bg-slate-100 text-slate-500 rounded-xl border border-slate-200 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Institution Discipline / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Management">Management</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Architecture">Architecture</option>
                <option value="Polytechnic">Polytechnic</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Year of Establishment
              </label>
              <input
                type="text"
                value={estYear}
                onChange={(e) => setEstYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Head of Institution / Signatory */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Head of Institution & Principal Signatory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Principal / Director Full Name
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Authorized Mobile / Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approved Annual Intake Capacity
              </label>
              <input
                type="text"
                value={approvedSeats}
                onChange={(e) => setApprovedSeats(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Registered Physical Campus Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Update Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};

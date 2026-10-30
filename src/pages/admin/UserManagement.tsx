import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Shield,
  MapPin,
  Building2,
  X
} from 'lucide-react';
import { authService } from '../../services/authService';
import { User, UserRole } from '../../types';
import { ROLE_LABELS } from '../../services/rbacService';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => authService.getUsers());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create User Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('REGIONAL_OFFICER');
  const [newDesignation, setNewDesignation] = useState('');
  const [newRegion, setNewRegion] = useState('Northern');
  const [newPhone, setNewPhone] = useState('');

  const refreshList = () => {
    setUsers(authService.getUsers());
  };

  const handleToggleStatus = (id: string) => {
    authService.toggleUserStatus(id);
    refreshList();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    authService.createUser({
      name: newName,
      email: newEmail,
      role: newRole,
      roleTitle: ROLE_LABELS[newRole],
      designation: newDesignation || `${ROLE_LABELS[newRole]} Official`,
      phone: newPhone || '+91 11 29581000',
      region: newRole === 'REGIONAL_OFFICER' ? (newRegion as any) : undefined,
      isActive: true,
      permissions: []
    });

    setIsCreateOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewDesignation('');
    refreshList();
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.roleTitle.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'INACTIVE' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Super Admin Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Access Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            User Management & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create, configure, deactivate, and assign role jurisdictions across AICTE Officers, Regional Offices, and Institutions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New User Account</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by officer name, email, or designation..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:bg-white focus:border-purple-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2.5 overflow-x-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="AICTE_ADMIN">AICTE Central Admin</option>
            <option value="REGIONAL_OFFICER">Regional Officer</option>
            <option value="EVC_MEMBER">EVC Member</option>
            <option value="INSTITUTION_ADMIN">Institution Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">User & Contact</th>
                <th className="py-3 px-4">Role & Authority</th>
                <th className="py-3 px-4">Jurisdiction / Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                        {u.initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{u.roleTitle}</span>
                    <div className="text-[10px] text-slate-400">{u.designation}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {u.region ? (
                      <span className="inline-flex items-center space-x-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>{u.region} Region</span>
                      </span>
                    ) : u.instituteName ? (
                      <span className="inline-flex items-center space-x-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                        <Building2 className="w-3 h-3" />
                        <span>{u.instituteName}</span>
                      </span>
                    ) : u.committeeName ? (
                      <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        <Shield className="w-3 h-3" />
                        <span>{u.committeeName}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">National Scope</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                        }`}
                    >
                      {u.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Deactivated</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${u.isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Create New User Account
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new officer, committee member, or institutional administrator.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Dr. Priya Sundaram"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. p.sundaram@aicte-india.org"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-hidden bg-white"
                  >
                    <option value="REGIONAL_OFFICER">Regional Officer</option>
                    <option value="AICTE_ADMIN">AICTE Central Admin</option>
                    <option value="EVC_MEMBER">EVC Committee Member</option>
                    <option value="INSTITUTION_ADMIN">Institution Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Region Jurisdiction
                  </label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    disabled={newRole !== 'REGIONAL_OFFICER' && newRole !== 'EVC_MEMBER'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-hidden bg-white disabled:bg-slate-50"
                  >
                    <option value="Northern">Northern</option>
                    <option value="Southern">Southern</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Western">Western</option>
                    <option value="Central">Central</option>
                    <option value="North Eastern">North Eastern</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Designation / Title
                </label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="e.g. Deputy Director, Approval Bureau"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


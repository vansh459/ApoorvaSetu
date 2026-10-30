import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldAlert,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import { authService } from '../../services/authService';
import { AuditLog } from '../../types';

export const AuditLogs: React.FC = () => {
  const [logs] = useState<AuditLog[]>(() => authService.getAuditLogs());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || log.userRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  const exportLogsAsCSV = () => {
    const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      l.userRole,
      l.action,
      l.entityType,
      l.entityId,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ApoorvaSetu_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Super Admin Security
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Immutable Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Activity & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cryptographically timestamped trail of all system mutations, user logins, stage advancements, approvals, and security updates.
          </p>
        </div>

        <button
          onClick={exportLogsAsCSV}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Logs (CSV)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action code, details or application ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:bg-white focus:border-amber-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Roles ({logs.length})</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="AICTE_ADMIN">AICTE Central Admin</option>
            <option value="REGIONAL_OFFICER">Regional Officer</option>
            <option value="EVC_MEMBER">EVC Member</option>
            <option value="INSTITUTION_ADMIN">Institution Admin</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Responsible Actor</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap text-[11px]">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                    <span className="font-medium">{log.entityType}</span>{' '}
                    <span className="text-slate-400 font-mono text-[10px]">{log.entityId}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-md truncate">
                    {log.details}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                {selectedLog.id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">{selectedLog.timestamp}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1 font-mono">
              {selectedLog.action}
            </h3>
            <p className="text-xs text-slate-600 mb-4">{selectedLog.details}</p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Responsible User:</span>
                <span className="font-bold text-slate-800">{selectedLog.userName} ({selectedLog.userId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">User Role:</span>
                <span className="font-semibold text-slate-800">{selectedLog.userRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Entity:</span>
                <span className="font-bold text-blue-700">{selectedLog.entityType} ({selectedLog.entityId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Origin IP:</span>
                <span className="font-mono text-slate-700">{selectedLog.ipAddress}</span>
              </div>

              {selectedLog.previousState && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Previous State</div>
                  <div className="text-slate-700 mt-0.5 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                    {selectedLog.previousState}
                  </div>
                </div>
              )}

              {selectedLog.newState && (
                <div className="pt-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">New State</div>
                  <div className="text-slate-700 mt-0.5 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                    {selectedLog.newState}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs cursor-pointer hover:bg-slate-800"
              >
                Close Audit Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


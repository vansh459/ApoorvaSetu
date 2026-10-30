import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Save,
  RotateCcw,
  Lock
} from 'lucide-react';
import { authService } from '../../services/authService';
import { UserRole, Permission } from '../../types';
import { ROLE_LABELS } from '../../services/rbacService';

interface PermissionGroup {
  groupName: string;
  permissions: { key: Permission; label: string; description: string }[];
}

export const RolePermissions: React.FC = () => {
  const [permissionsMap, setPermissionsMap] = useState<Record<UserRole, Permission[]>>(() =>
    authService.getRolePermissions()
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const roles: UserRole[] = [
    'SUPER_ADMIN',
    'AICTE_ADMIN',
    'REGIONAL_OFFICER',
    'EVC_MEMBER',
    'INSTITUTION_ADMIN'
  ];

  const permissionGroups: PermissionGroup[] = [
    {
      groupName: 'User & Access Governance',
      permissions: [
        { key: 'users.read', label: 'View Users', description: 'Read user accounts and profiles' },
        { key: 'users.create', label: 'Create Users', description: 'Provision new officer and admin accounts' },
        { key: 'users.update', label: 'Edit Users', description: 'Update profile and authority details' },
        { key: 'users.delete', label: 'Deactivate Users', description: 'Suspend or deactivate system accounts' },
        { key: 'roles.manage', label: 'Manage Roles', description: 'Configure granular permissions matrix' }
      ]
    },
    {
      groupName: 'Approval Applications',
      permissions: [
        { key: 'applications.read', label: 'View Applications', description: 'Access institutional approval files' },
        { key: 'applications.create', label: 'Submit Applications', description: 'Initiate new EoA or expansion requests' },
        { key: 'applications.review', label: 'Review Applications', description: 'Perform technical and scrutiny review' },
        { key: 'applications.forward', label: 'Forward Stages', description: 'Advance applications to next workflow milestone' },
        { key: 'applications.return', label: 'Return for Correction', description: 'Issue deficiency query to institutions' },
        { key: 'applications.approve', label: 'Grant Approval', description: 'Issue regulatory approval letters' },
        { key: 'applications.reject', label: 'Reject Applications', description: 'Reject applications with recorded reasons' }
      ]
    },
    {
      groupName: 'Institutions & Campus Records',
      permissions: [
        { key: 'institutes.read', label: 'View Institutions', description: 'Read institutional profiles and directory' },
        { key: 'institutes.update', label: 'Update Institution', description: 'Edit institutional details and contact' },
        { key: 'institutes.manage', label: 'Manage Institutions', description: 'Change accreditation and intake limits' }
      ]
    },
    {
      groupName: 'Inspection & EVC Coordination',
      permissions: [
        { key: 'workflow.manage', label: 'Configure Workflow', description: 'Adjust approval stages and parameters' },
        { key: 'evc.read', label: 'View EVC Visits', description: 'Access inspection schedules and committees' },
        { key: 'evc.schedule', label: 'Schedule EVC Visits', description: 'Constitute committee and set inspection date' },
        { key: 'evc.assign', label: 'Assign Committee', description: 'Nominate expert members for inspections' },
        { key: 'evc.report.submit', label: 'Submit EVC Report', description: 'Upload inspection findings and scores' }
      ]
    },
    {
      groupName: 'Documents & Statutory Compliance',
      permissions: [
        { key: 'documents.read', label: 'View Documents', description: 'Access uploaded legal & academic deeds' },
        { key: 'documents.upload', label: 'Upload Documents', description: 'Submit digital institutional records' },
        { key: 'documents.verify', label: 'Verify Documents', description: 'Approve or reject uploaded files' },
        { key: 'compliance.read', label: 'View Compliance', description: 'Monitor mandatory undertakings' },
        { key: 'compliance.submit', label: 'Submit Compliance', description: 'Upload anti-ragging & land affidavits' },
        { key: 'compliance.verify', label: 'Verify Compliance', description: 'Confirm compliance authenticity' }
      ]
    },
    {
      groupName: 'Reports, Audit & Configuration',
      permissions: [
        { key: 'reports.read', label: 'View Reports', description: 'Access analytical reports and evidence' },
        { key: 'reports.export', label: 'Export Reports', description: 'Download PDF and spreadsheet summaries' },
        { key: 'audit.read', label: 'View Audit Logs', description: 'Inspect timestamped platform audit trail' },
        { key: 'system.config', label: 'System Configuration', description: 'Toggle maintenance and cycle parameters' }
      ]
    }
  ];

  const handleToggle = (role: UserRole, permission: Permission) => {
    // Super admin role retains all permissions
    if (role === 'SUPER_ADMIN') return;

    const current = permissionsMap[role] || [];
    const isEnabled = current.includes(permission);
    const updated = isEnabled
      ? current.filter((p) => p !== permission)
      : [...current, permission];

    const nextMap = { ...permissionsMap, [role]: updated };
    setPermissionsMap(nextMap);

    authService.updateRolePermission(role, permission, !isEnabled);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Super Admin Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">RBAC Security Matrix</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Role & Permissions Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure fine-grained capability grants across all 5 operational tiers. Changes take effect across active sessions.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Permissions updated in active directory!</span>
          </div>
        )}
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 w-72 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  Permission / Capability
                </th>
                {roles.map((r) => (
                  <th key={r} className="py-3 px-3 text-center text-[11px] font-bold text-slate-800">
                    <div>{ROLE_LABELS[r]}</div>
                    <span className="text-[9px] font-mono text-slate-400 font-normal">
                      ({r})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionGroups.map((group) => (
                <React.Fragment key={group.groupName}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-50/80 border-t border-b border-slate-200/60">
                    <td colSpan={roles.length + 1} className="py-2 px-4 font-bold text-slate-800 text-[11px] uppercase tracking-wider bg-slate-100/70">
                      {group.groupName}
                    </td>
                  </tr>

                  {/* Individual Permissions */}
                  {group.permissions.map((perm) => (
                    <tr key={perm.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{perm.label}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{perm.key}</div>
                      </td>

                      {roles.map((r) => {
                        const isGranted = (permissionsMap[r] || []).includes(perm.key);
                        const isLocked = r === 'SUPER_ADMIN';

                        return (
                          <td key={r} className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleToggle(r, perm.key)}
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${isLocked
                                  ? 'bg-purple-100 text-purple-700 cursor-not-allowed opacity-90'
                                  : isGranted
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-2xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-400 cursor-pointer'
                                }`}
                              title={
                                isLocked
                                  ? 'Super Admin retains full system permissions'
                                  : isGranted
                                    ? `Revoke ${perm.label} for ${ROLE_LABELS[r]}`
                                    : `Grant ${perm.label} to ${ROLE_LABELS[r]}`
                              }
                            >
                              {isGranted ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


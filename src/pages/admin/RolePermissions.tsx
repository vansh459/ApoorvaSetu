import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { authService } from '../../services/authService';
import { UserRole, Permission } from '../../types';
import { ROLE_LABELS } from '../../services/rbacService';
import { Badge, Card, Notice, PageHeader } from '../../components/ui';

interface PermissionGroup {
  groupName: string;
  permissions: { key: Permission; label: string; description: string }[];
}

export const RolePermissions: React.FC = () => {
  const [permissionsMap, setPermissionsMap] = useState<Record<UserRole, Permission[]>>(() =>
    authService.getRolePermissions()
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles: UserRole[] = [
    'SUPER_ADMIN',
    'AICTE_ADMIN',
    'REGIONAL_OFFICER',
    'EVC_MEMBER',
    'INSTITUTION_ADMIN'
  ];

  const permissionGroups: PermissionGroup[] = [
    {
      groupName: 'User and access governance',
      permissions: [
        { key: 'users.read', label: 'View users', description: 'Read user accounts and profiles' },
        { key: 'users.create', label: 'Create users', description: 'Provision new officer and admin accounts' },
        { key: 'users.update', label: 'Edit users', description: 'Update profile and authority details' },
        { key: 'users.delete', label: 'Deactivate users', description: 'Suspend or deactivate system accounts' },
        { key: 'roles.manage', label: 'Manage roles', description: 'Configure granular permissions matrix' }
      ]
    },
    {
      groupName: 'Approval applications',
      permissions: [
        { key: 'applications.read', label: 'View applications', description: 'Access institutional approval files' },
        { key: 'applications.create', label: 'Submit applications', description: 'Initiate new EoA or expansion requests' },
        { key: 'applications.review', label: 'Review applications', description: 'Perform technical and scrutiny review' },
        { key: 'applications.forward', label: 'Forward stages', description: 'Advance applications to next workflow milestone' },
        { key: 'applications.return', label: 'Return for correction', description: 'Issue deficiency query to institutions' },
        { key: 'applications.approve', label: 'Grant approval', description: 'Issue regulatory approval letters' },
        { key: 'applications.reject', label: 'Reject applications', description: 'Reject applications with recorded reasons' }
      ]
    },
    {
      groupName: 'Institutions and campus records',
      permissions: [
        { key: 'institutes.read', label: 'View institutions', description: 'Read institutional profiles and directory' },
        { key: 'institutes.update', label: 'Update institution', description: 'Edit institutional details and contact' },
        { key: 'institutes.manage', label: 'Manage institutions', description: 'Change accreditation and intake limits' }
      ]
    },
    {
      groupName: 'Inspection and EVC coordination',
      permissions: [
        { key: 'workflow.manage', label: 'Configure workflow', description: 'Adjust approval stages and parameters' },
        { key: 'evc.read', label: 'View EVC visits', description: 'Access inspection schedules and committees' },
        { key: 'evc.schedule', label: 'Schedule EVC visits', description: 'Constitute committee and set inspection date' },
        { key: 'evc.assign', label: 'Assign committee', description: 'Nominate expert members for inspections' },
        { key: 'evc.report.submit', label: 'Submit EVC report', description: 'Upload inspection findings and scores' }
      ]
    },
    {
      groupName: 'Documents and statutory compliance',
      permissions: [
        { key: 'documents.read', label: 'View documents', description: 'Access uploaded legal and academic deeds' },
        { key: 'documents.upload', label: 'Upload documents', description: 'Submit digital institutional records' },
        { key: 'documents.verify', label: 'Verify documents', description: 'Approve or reject uploaded files' },
        { key: 'compliance.read', label: 'View compliance', description: 'Monitor mandatory undertakings' },
        { key: 'compliance.submit', label: 'Submit compliance', description: 'Upload anti-ragging and land affidavits' },
        { key: 'compliance.verify', label: 'Verify compliance', description: 'Confirm compliance authenticity' }
      ]
    },
    {
      groupName: 'Reports, audit and configuration',
      permissions: [
        { key: 'reports.read', label: 'View reports', description: 'Access analytical reports and evidence' },
        { key: 'reports.export', label: 'Export reports', description: 'Download PDF and spreadsheet summaries' },
        { key: 'audit.read', label: 'View audit logs', description: 'Inspect timestamped platform audit trail' },
        { key: 'system.config', label: 'System configuration', description: 'Toggle maintenance and cycle parameters' }
      ]
    }
  ];

  const handleToggle = async (role: UserRole, permission: Permission) => {
    if (role === 'SUPER_ADMIN') return;

    const current = permissionsMap[role] || [];
    const isEnabled = current.includes(permission);
    const updated = isEnabled
      ? current.filter((p) => p !== permission)
      : [...current, permission];

    const nextMap = { ...permissionsMap, [role]: updated };
    setPermissionsMap(nextMap);
    setError(null);

    try {
      await authService.updateRolePermission(role, permission, !isEnabled);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setPermissionsMap(permissionsMap);
      setError(err instanceof Error ? err.message : 'Could not update the permission.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role permissions"
        description="Configure capability grants across the five operational tiers. Changes take effect across active sessions."
        meta={<Badge tone="neutral">Super admin console</Badge>}
      />

      {savedSuccess && (
        <Notice tone="success" icon={Check}>
          Permissions updated in the active directory.
        </Notice>
      )}

      {error && (
        <Notice tone="danger" icon={X}>
          {error}
        </Notice>
      )}

      <Card padded="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <caption className="sr-only">
              Permission grants for each role. Super admin retains every permission.
            </caption>
            <thead className="bg-surface-2">
              <tr>
                <th
                  scope="col"
                  className="w-72 px-4 py-3 text-xs font-medium text-ink-2"
                >
                  Permission
                </th>
                {roles.map((r) => (
                  <th
                    key={r}
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-ink"
                  >
                    <div>{ROLE_LABELS[r]}</div>
                    <span className="mt-0.5 block text-xs font-normal text-ink-2">{r}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionGroups.map((group) => (
                <React.Fragment key={group.groupName}>
                  <tr className="border-y border-line bg-surface-2/70">
                    <td
                      colSpan={roles.length + 1}
                      className="px-4 py-2 text-xs font-semibold text-ink-2"
                    >
                      {group.groupName}
                    </td>
                  </tr>

                  {group.permissions.map((perm) => (
                    <tr
                      key={perm.key}
                      className="border-t border-line transition-colors duration-150 hover:bg-surface-2/50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-sm font-medium text-ink">{perm.label}</div>
                        <div className="text-xs text-ink-2">{perm.key}</div>
                      </td>

                      {roles.map((r) => {
                        const isGranted = (permissionsMap[r] || []).includes(perm.key);
                        const isLocked = r === 'SUPER_ADMIN';

                        return (
                          <td key={r} className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              disabled={isLocked}
                              aria-pressed={isGranted}
                              aria-label={
                                isLocked
                                  ? `Super admin retains ${perm.label}`
                                  : `${isGranted ? 'Revoke' : 'Grant'} ${perm.label} for ${ROLE_LABELS[r]}`
                              }
                              onClick={() => handleToggle(r, perm.key)}
                              title={
                                isLocked
                                  ? 'Super admin retains full system permissions'
                                  : isGranted
                                    ? `Revoke ${perm.label} for ${ROLE_LABELS[r]}`
                                    : `Grant ${perm.label} to ${ROLE_LABELS[r]}`
                              }
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors duration-150 ${
                                isLocked
                                  ? 'cursor-not-allowed bg-accent-soft text-accent'
                                  : isGranted
                                    ? 'cursor-pointer bg-success text-white hover:bg-success/90'
                                    : 'cursor-pointer border border-line bg-surface-2 text-ink-3 hover:border-line-strong hover:text-ink-2'
                              }`}
                            >
                              {isGranted ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                              ) : (
                                <X className="h-3 w-3" aria-hidden="true" />
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
      </Card>
    </div>
  );
};

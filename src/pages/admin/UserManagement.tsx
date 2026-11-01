import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Search,
  Shield,
  UserPlus,
  XCircle
} from 'lucide-react';
import { authService } from '../../services/authService';
import { User, UserRole } from '../../types';
import { ROLE_LABELS } from '../../services/rbacService';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => authService.getUsers());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  const columns: DataTableColumn<User>[] = [
    {
      key: 'user',
      header: 'User and contact',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar initials={u.initials} />
          <div className="min-w-0">
            <div className="font-medium text-ink">{u.name}</div>
            <div className="text-xs text-ink-2">{u.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role and authority',
      render: (u) => (
        <div>
          <div className="font-medium text-ink">{u.roleTitle}</div>
          <div className="text-xs text-ink-2">{u.designation}</div>
        </div>
      )
    },
    {
      key: 'scope',
      header: 'Jurisdiction',
      render: (u) =>
        u.region ? (
          <Badge tone="neutral">
            <MapPin className="mr-1 h-3 w-3" aria-hidden="true" />
            {u.region} Region
          </Badge>
        ) : u.instituteName ? (
          <Badge tone="neutral">
            <Building2 className="mr-1 h-3 w-3" aria-hidden="true" />
            {u.instituteName}
          </Badge>
        ) : u.committeeName ? (
          <Badge tone="neutral">
            <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
            {u.committeeName}
          </Badge>
        ) : (
          <span className="text-ink-2">National scope</span>
        )
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge tone={u.isActive ? 'success' : 'danger'}>
          {u.isActive ? (
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
          ) : (
            <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
          )}
          {u.isActive ? 'Active' : 'Deactivated'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last login',
      render: (u) => (
        <span className="whitespace-nowrap text-ink-2">
          {u.lastLogin
            ? new Date(u.lastLogin).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })
            : 'Never'}
        </span>
      )
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (u) => (
        <Button
          size="sm"
          variant={u.isActive ? 'ghost' : 'secondary'}
          onClick={() => handleToggleStatus(u.id)}
        >
          {u.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User accounts"
        description="Create, configure and deactivate officers, committees and institutional administrators."
        meta={<Badge tone="neutral">Super admin console</Badge>}
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            Create user
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by officer name, email, or designation"
              aria-label="Search users"
              className="pl-9"
            />
          </div>

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="ALL">All roles ({users.length})</option>
            <option value="SUPER_ADMIN">Super admin</option>
            <option value="AICTE_ADMIN">AICTE central admin</option>
            <option value="REGIONAL_OFFICER">Regional officer</option>
            <option value="EVC_MEMBER">EVC member</option>
            <option value="INSTITUTION_ADMIN">Institution admin</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Deactivated only</option>
          </Select>
        </div>
      </Card>

      <DataTable<User>
        caption="User accounts with role, jurisdiction and status"
        columns={columns}
        rows={filteredUsers}
        rowKey={(u) => u.id}
        minWidth="920px"
        empty={
          <EmptyState
            icon={Search}
            title="No users match these filters"
            description="Clear the search or choose a different role or status."
          />
        }
      />

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create user account"
        subtitle="Add a new officer, committee member or institutional administrator."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-user-form">
              Create account
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <Field label="Full name" htmlFor="new-user-name" required>
            <Input
              id="new-user-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Dr. Priya Sundaram"
              required
            />
          </Field>

          <Field label="Official email address" htmlFor="new-user-email" required>
            <Input
              id="new-user-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="p.sundaram@aicte-india.org"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Assigned role" htmlFor="new-user-role">
              <Select
                id="new-user-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
              >
                <option value="REGIONAL_OFFICER">Regional officer</option>
                <option value="AICTE_ADMIN">AICTE central admin</option>
                <option value="EVC_MEMBER">EVC committee member</option>
                <option value="INSTITUTION_ADMIN">Institution admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </Select>
            </Field>

            <Field
              label="Region jurisdiction"
              htmlFor="new-user-region"
              hint={
                newRole === 'REGIONAL_OFFICER' || newRole === 'EVC_MEMBER'
                  ? undefined
                  : 'Only regional officers and EVC members are scoped to a region.'
              }
            >
              <Select
                id="new-user-region"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                disabled={newRole !== 'REGIONAL_OFFICER' && newRole !== 'EVC_MEMBER'}
              >
                <option value="Northern">Northern</option>
                <option value="Southern">Southern</option>
                <option value="Eastern">Eastern</option>
                <option value="Western">Western</option>
                <option value="Central">Central</option>
                <option value="North Eastern">North Eastern</option>
              </Select>
            </Field>
          </div>

          <Field label="Official designation" htmlFor="new-user-designation" hint="Optional.">
            <Input
              id="new-user-designation"
              type="text"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              placeholder="Deputy Director, Approval Bureau"
            />
          </Field>

          <Field label="Phone number" htmlFor="new-user-phone" hint="Optional.">
            <Input
              id="new-user-phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+91 11 29581000"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};

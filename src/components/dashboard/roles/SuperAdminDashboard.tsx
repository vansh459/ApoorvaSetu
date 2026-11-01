import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  Activity,
  Server,
  Sliders,
  History
} from 'lucide-react';
import { authService } from '../../../services/authService';
import { listAuditLogs } from '../../../services/auditService';
import { regionalOffices } from '../../../data/initialData';
import { useApp } from '../../../context/AppContext';
import { alertSummary } from '../../../workflow/selectors';
import { daysUntil, getNow } from '../../../utils/dates';
import { User, Application, AuditLog } from '../../../types';
import { DashboardScaffold } from '../DashboardScaffold';
import { Badge, Button, Card } from '../../ui';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { applications, institutes, alerts } = useApp();
  const users = authService.getUsers();
  const allAuditLogs = listAuditLogs();
  const auditLogs = allAuditLogs.slice(0, 5);
  const config = authService.getSystemConfig();
  const cycleDaysLeft = daysUntil(config.approvalCycleEndDate, getNow());
  const alertsInForce = alertSummary(alerts);

  const activeUsersCount = users.filter((u: User) => u.isActive).length;
  const approvedApps = applications.filter((a: Application) => a.status === 'Approved').length;
  const pendingApps = applications.filter(
    (a: Application) => a.status !== 'Approved' && a.status !== 'Rejected'
  ).length;

  const regionalRows = regionalOffices.slice(0, 5).map((office) => ({
    ...office,
    instituteCount: institutes.filter((institute) => institute.region === office.region).length,
    activeCount: applications.filter(
      (app) =>
        app.region === office.region && app.status !== 'Approved' && app.status !== 'Rejected'
    ).length
  }));

  const roleRows = [
    { role: 'SUPER_ADMIN', label: 'Super administrators' },
    { role: 'AICTE_ADMIN', label: 'AICTE central officers' },
    { role: 'REGIONAL_OFFICER', label: 'Regional officers' },
    { role: 'EVC_MEMBER', label: 'EVC committee inspectors' },
    { role: 'INSTITUTION_ADMIN', label: 'Institution principals and admins' }
  ].map((row) => ({
    ...row,
    count: users.filter((u: User) => u.role === row.role).length
  }));

  return (
    <DashboardScaffold
      title="Platform operations"
      description="Manage user tiers, configure regulatory workflows, inspect audit trails and maintain system health."
      meta={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 px-2.5 py-1">
          Super administrator, national governance
        </span>
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/admin/audit-logs')}>
            Audit trail
          </Button>
          <Button onClick={() => navigate('/admin/users')}>Manage users</Button>
        </>
      }
      stats={[
        {
          label: 'Registered users',
          value: users.length,
          delta: `${activeUsersCount} active`,
          icon: Users,
          onClick: () => navigate('/admin/users')
        },
        {
          label: 'Active institutions',
          value: institutes.length,
          delta: 'Verified',
          icon: Building2,
          onClick: () => navigate('/institutes')
        },
        {
          label: 'Total applications',
          value: applications.length,
          delta: `AY ${config.academicYear}`,
          icon: FileText,
          onClick: () => navigate('/applications')
        },
        {
          label: 'Active applications',
          value: pendingApps,
          delta: 'In pipeline',
          icon: Clock,
          onClick: () => navigate('/applications')
        },
        {
          label: 'Approved applications',
          value: approvedApps,
          delta: 'Grant issued',
          icon: CheckCircle2,
          onClick: () => navigate('/applications?status=Approved')
        }
      ]}
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Activity className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Regional jurisdictions</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/regions-officials')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              View offices
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Regional offices with institute and active application counts</caption>
              <thead>
                <tr className="border-b border-line text-xs text-ink-2">
                  <th scope="col" className="px-5 py-2.5 font-medium">Region</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Headquarters</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Officer</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Institutes</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {regionalRows.map((ro) => (
                  <tr key={ro.id} className="transition-colors duration-150 hover:bg-surface-2">
                    <td className="px-5 py-3 font-medium text-ink">{ro.region}</td>
                    <td className="px-3 py-3 text-ink-2">{ro.headquarters}</td>
                    <td className="px-3 py-3 text-ink-2">{ro.officerName}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{ro.instituteCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink">{ro.activeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">User tier distribution</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/roles')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              Role matrix
            </button>
          </div>

          <div className="my-auto space-y-2.5 px-5 py-5 text-sm">
            {roleRows.map((item) => (
              <div key={item.role} className="flex items-center justify-between gap-3">
                <span className="truncate text-ink-2">{item.label}</span>
                <span className="shrink-0 font-medium tabular-nums text-ink">{item.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-line px-5 py-3 text-xs text-ink-2">
            <span>Role-based access control</span>
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <CheckCircle2 className="h-3 w-3" strokeWidth={1.75} /> Enforced
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <Card padded="none" className="flex flex-col lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <History className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Recent administrative actions</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/audit-logs')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              Full logs ({allAuditLogs.length})
            </button>
          </div>

          <div className="my-auto divide-y divide-line/70">
            {auditLogs.map((log: AuditLog) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{log.userName}</span>
                    <Badge tone="neutral" size="sm">
                      {log.userRole}
                    </Badge>
                    <span className="font-mono text-xs text-ink-2">{log.action}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">{log.details}</p>
                </div>
                <div className="shrink-0 text-xs text-ink-2 sm:text-right">
                  <div>{log.timestamp}</div>
                  <div className="font-mono">{log.ipAddress}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padded="none" className="flex flex-col lg:col-span-4">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Server className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold leading-snug text-ink">Automation and alerts</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/system-config')}
              className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
            >
              Config
            </button>
          </div>

          <div className="my-auto space-y-2.5 px-5 py-5 text-sm">
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="flex w-full items-center justify-between gap-3 rounded-control border border-line bg-surface-2 px-3 py-3 text-left transition-colors duration-150 hover:border-line-strong cursor-pointer"
            >
              <div>
                <div className="font-medium text-ink">Deadline alerts</div>
                <div className="mt-0.5 text-xs text-ink-2">
                  {alertsInForce.critical} critical, {alertsInForce.high} high severity
                </div>
              </div>
              <span className="text-2xl font-semibold tabular-nums text-ink">
                {alertsInForce.open + alertsInForce.acknowledged}
              </span>
            </button>

            <div className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-3">
              <div>
                <div className="font-medium text-ink">Academic year cycle</div>
                <div className="mt-0.5 text-xs text-ink-2">AY {config.academicYear}</div>
              </div>
              <Badge tone={cycleDaysLeft >= 0 ? 'success' : 'neutral'} size="sm">
                {cycleDaysLeft >= 0 ? 'Open' : 'Closed'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-3">
              <div>
                <div className="font-medium text-ink">Cycle deadline</div>
                <div className="mt-0.5 text-xs text-ink-2">{config.approvalCycleEndDate}</div>
              </div>
              <span className="shrink-0 text-xs text-ink-2">
                {cycleDaysLeft >= 0
                  ? `${cycleDaysLeft} days left`
                  : `Ended ${Math.abs(cycleDaysLeft)} days ago`}
              </span>
            </div>
          </div>

          <div className="mt-auto border-t border-line px-5 py-4">
            <Button
              fullWidth
              onClick={() => navigate('/admin/system-config')}
              icon={<Sliders className="h-4 w-4" strokeWidth={1.75} />}
            >
              Configure system settings
            </Button>
          </div>
        </Card>
      </div>
    </DashboardScaffold>
  );
};

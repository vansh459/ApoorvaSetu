import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { StageMovementChart } from '../StageMovementChart';
import { RegionalDonutChart } from '../RegionalDonutChart';
import { UpcomingEVCList } from '../UpcomingEVCList';
import { RecentApplicationsTable } from '../RecentApplicationsTable';
import { ComplianceValidityWidget } from '../ComplianceValidityWidget';
import { QuickActionsPanel } from '../QuickActionsPanel';
import { DashboardScaffold } from '../DashboardScaffold';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { filterApplicationsForUser } from '../../../services/rbacService';
import { authService } from '../../../services/authService';
import { resolveWorkflowConfig } from '../../../workflow/config';
import { latestUpdated, pipelineMetrics } from '../../../workflow/selectors';
import { formatDisplayDate, getNow } from '../../../utils/dates';
import { Button } from '../../ui';

export const AICTEAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { applications } = useApp();
  const { user } = useAuth();

  const scoped = filterApplicationsForUser(applications, user);
  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const metrics = pipelineMetrics(scoped, config, getNow());
  const updated = latestUpdated(scoped);

  return (
    <DashboardScaffold
      title="Dashboard"
      description="National overview of affiliation applications, scrutiny, inspections and compliance."
      meta={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 px-2.5 py-1">
            AICTE central office
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
            {updated ? `Updated ${formatDisplayDate(updated)}` : 'No activity recorded yet'}
          </span>
        </>
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/reports')}>
            Reports
          </Button>
          <Button
            onClick={() => navigate('/applications')}
          >
            Review applications
          </Button>
        </>
      }
      stats={[
        {
          label: 'Total applications',
          value: metrics.total.toLocaleString(),
          delta: `${metrics.breached} breached`,
          icon: FileText,
          onClick: () => navigate('/applications')
        },
        {
          label: 'Pending at current stage',
          value: metrics.pending.toLocaleString(),
          delta: `${metrics.approaching} approaching`,
          icon: Clock,
          onClick: () => navigate('/applications')
        },
        {
          label: 'Approved',
          value: metrics.approved.toLocaleString(),
          delta: `${metrics.rejected} rejected`,
          icon: CheckCircle2,
          onClick: () => navigate('/applications?status=Approved')
        },
        {
          label: 'Requiring action',
          value: metrics.actionRequired.toLocaleString(),
          delta: `${metrics.dueToday} due today`,
          icon: AlertTriangle,
          onClick: () => navigate('/applications?status=Action+Required')
        }
      ]}
    >
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="flex min-w-0 flex-col">
          <StageMovementChart />
        </div>
        <div className="flex min-w-0 flex-col">
          <RegionalDonutChart />
        </div>
        <div className="flex min-w-0 flex-col">
          <UpcomingEVCList />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="flex min-w-0 flex-col lg:col-span-6">
          <RecentApplicationsTable />
        </div>
        <div className="flex min-w-0 flex-col lg:col-span-3">
          <ComplianceValidityWidget />
        </div>
        <div className="flex min-w-0 flex-col lg:col-span-3">
          <QuickActionsPanel />
        </div>
      </div>
    </DashboardScaffold>
  );
};

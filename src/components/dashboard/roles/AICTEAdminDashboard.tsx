import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { StatCard } from '../StatCard';
import { StageMovementChart } from '../StageMovementChart';
import { RegionalDonutChart } from '../RegionalDonutChart';
import { UpcomingEVCList } from '../UpcomingEVCList';
import { RecentApplicationsTable } from '../RecentApplicationsTable';
import { ComplianceValidityWidget } from '../ComplianceValidityWidget';
import { QuickActionsPanel } from '../QuickActionsPanel';

export const AICTEAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Clean Minimal Page Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>

        {/* Subtle Last Updated Timestamp */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Updated 30 Oct 2026, 11:24 AM</span>
        </div>
      </div>

      {/* Row 1: Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value="5,482"
          trendText="↑ 12% vs last month"
          trendColor="blue"
          icon={FileText}
          variant="blue"
          onClick={() => navigate('/applications')}
        />

        <StatCard
          title="Pending at Current Stage"
          value="2,134"
          trendText="↓ 5% vs last month"
          trendColor="amber"
          icon={Clock}
          variant="amber"
          onClick={() => navigate('/applications?status=Pending')}
        />

        <StatCard
          title="Approved"
          value="2,961"
          trendText="↑ 18% vs last month"
          trendColor="green"
          icon={CheckCircle2}
          variant="green"
          onClick={() => navigate('/applications?status=Approved')}
        />

        <StatCard
          title="Requiring Action"
          value="387"
          trendText="↑ 3% vs last month"
          trendColor="rose"
          icon={AlertTriangle}
          variant="rose"
          onClick={() => navigate('/applications?status=Action+Required')}
        />
      </div>

      {/* Row 2: Stage Movement, Regional Donut, and Upcoming EVC Visits (all side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        <div className="flex flex-col min-w-0">
          <StageMovementChart />
        </div>

        <div className="flex flex-col min-w-0">
          <RegionalDonutChart />
        </div>

        <div className="flex flex-col min-w-0">
          <UpcomingEVCList />
        </div>
      </div>

      {/* Row 3: Recent Applications Table, Compliance Validity, and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        <div className="lg:col-span-6 flex flex-col min-w-0">
          <RecentApplicationsTable />
        </div>

        <div className="lg:col-span-3 flex flex-col min-w-0">
          <ComplianceValidityWidget />
        </div>

        <div className="lg:col-span-3 flex flex-col min-w-0">
          <QuickActionsPanel />
        </div>
      </div>
    </div>
  );
};


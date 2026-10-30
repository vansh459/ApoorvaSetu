import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { StageMovementChart } from '../components/dashboard/StageMovementChart';
import { RegionalDonutChart } from '../components/dashboard/RegionalDonutChart';
import { UpcomingEVCList } from '../components/dashboard/UpcomingEVCList';
import { RecentApplicationsTable } from '../components/dashboard/RecentApplicationsTable';
import { ComplianceValidityWidget } from '../components/dashboard/ComplianceValidityWidget';
import { QuickActionsPanel } from '../components/dashboard/QuickActionsPanel';
import { BottomInfoCards } from '../components/dashboard/BottomInfoCards';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track applications, monitor pendency, manage EVCs, compliance and approvals — all in one place.
          </p>
        </div>

        {/* Right: Last Updated Badge */}
        <div className="flex items-center space-x-2 text-right shrink-0">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-medium text-slate-400 leading-tight">
              Last Updated
            </div>
            <div className="text-xs font-semibold text-slate-700 leading-tight">
              22 Oct 2025, 11:45 AM
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Top 4 Summary Cards matching screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value="5,482"
          subtext="vs. last month"
          trendText="↑ 12%"
          trendColor="green"
          icon={FileText}
          variant="blue"
          onClick={() => navigate('/applications')}
        />

        <StatCard
          title="Pending at Current Stage"
          value="2,134"
          subtext="39% of total"
          trendText="↑ 6%"
          trendColor="amber"
          icon={Clock}
          variant="amber"
          onClick={() => navigate('/applications?status=Pending')}
        />

        <StatCard
          title="Approved"
          value="2,961"
          subtext="54% of total"
          trendText="↑ 10%"
          trendColor="green"
          icon={CheckCircle2}
          variant="green"
          onClick={() => navigate('/applications?status=Approved')}
        />

        <StatCard
          title="Requiring Action"
          value="387"
          subtext="7% of total"
          trendText="↑ 4%"
          trendColor="rose"
          icon={AlertTriangle}
          variant="rose"
          onClick={() => navigate('/applications?status=Action+Required')}
        />
      </div>

      {/* Row 2: Stage Movement, Regional Donut, and Upcoming EVC Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-12 xl:col-span-4 flex flex-col min-w-0">
          <StageMovementChart />
        </div>

        <div className="lg:col-span-6 xl:col-span-4 flex flex-col min-w-0">
          <RegionalDonutChart />
        </div>

        <div className="lg:col-span-6 xl:col-span-4 flex flex-col min-w-0">
          <UpcomingEVCList />
        </div>
      </div>

      {/* Row 3: Recent Applications Table, Compliance Validity, and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-12 xl:col-span-6 flex flex-col min-w-0">
          <RecentApplicationsTable />
        </div>

        <div className="lg:col-span-6 xl:col-span-3 flex flex-col min-w-0">
          <ComplianceValidityWidget />
        </div>

        <div className="lg:col-span-6 xl:col-span-3 flex flex-col min-w-0">
          <QuickActionsPanel />
        </div>
      </div>

      {/* Row 4: Bottom 4 feature cards */}
      <BottomInfoCards />
    </div>
  );
};

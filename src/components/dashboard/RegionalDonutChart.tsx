import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { regionBreakdown } from '../../workflow/selectors';
import type { Region } from '../../types';
import { Card } from '../ui';

const REGION_COLORS: Record<Region, string> = {
  Northern: 'var(--color-chart-1)',
  Southern: 'var(--color-chart-2)',
  Eastern: 'var(--color-chart-3)',
  Western: 'var(--color-chart-4)',
  Central: 'var(--color-chart-5)',
  'North Eastern': 'var(--color-chart-6)',
  Others: 'var(--color-ink-3)'
};

export const RegionalDonutChart: React.FC = () => {
  const navigate = useNavigate();
  const { applications } = useApp();
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = regionBreakdown(filterApplicationsForUser(applications, user)).map((row) => ({
    name: row.region,
    value: row.count,
    percentage: row.share,
    color: REGION_COLORS[row.region]
  }));

  const totalApplications = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  return (
    <Card padded="none" className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <BarChart2 className="h-4 w-4 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">Applications by region</h2>
      </div>

      {chartData.length === 0 ? (
        <p className="my-auto px-5 py-10 text-center text-sm text-ink-2">
          No applications in scope yet.
        </p>
      ) : (
        <div className="my-auto flex min-w-0 items-center gap-3 px-5 py-5">
          <div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center">
            <PieChart width={112} height={112}>
              <Pie
                data={chartData}
                cx={56}
                cy={56}
                innerRadius={36}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
                stroke="var(--color-surface)"
                strokeWidth={2}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(entry: any) => {
                  if (entry && entry.name) {
                    navigate(`/applications?region=${encodeURIComponent(String(entry.name))}`);
                  }
                }}
              >
                {chartData.map((entry, index) => {
                  const isHovered = activeIndex === index;
                  const isAnyHovered = activeIndex !== null;
                  return (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.color}
                      opacity={!isAnyHovered || isHovered ? 1 : 0.35}
                      className="cursor-pointer outline-none"
                    />
                  );
                })}
              </Pie>
            </PieChart>

            <div className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center px-1 text-center">
              <span className="text-lg font-semibold leading-none tracking-tight text-ink">
                {activeItem ? activeItem.value.toLocaleString() : totalApplications.toLocaleString()}
              </span>
              <span className="mt-1 max-w-[76px] truncate text-xs text-ink-2">
                {activeItem ? activeItem.name : 'Total'}
              </span>
              {activeItem && <span className="mt-0.5 text-xs text-ink-2">({activeItem.percentage}%)</span>}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            {chartData.map((reg, index) => {
              const isHovered = activeIndex === index;
              return (
                <button
                  key={reg.name}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  onClick={() => navigate(`/applications?region=${encodeURIComponent(reg.name)}`)}
                  aria-label={`${reg.name}: ${reg.value} applications, ${reg.percentage} per cent`}
                  title={`${reg.value} applications, ${reg.percentage}%`}
                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-control px-1.5 py-1 text-left text-xs transition-colors duration-150 ${
                    isHovered ? 'bg-surface-2' : 'hover:bg-surface-2'
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: reg.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-ink">{reg.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-2">{reg.value.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { regionalDistributionData } from '../../data/initialData';

export const RegionalDonutChart: React.FC = () => {
  const navigate = useNavigate();

  // Region colors matching the reference screenshot exactly
  const regionColors: Record<string, string> = {
    Northern: '#2563eb', // Royal Blue
    Southern: '#22c55e', // Green
    Eastern: '#f59e0b', // Amber/Orange
    Western: '#6366f1', // Purple/Indigo
    Central: '#06b6d4', // Cyan
    'North Eastern': '#f43f5e', // Rose
    Others: '#64748b' // Slate
  };

  const chartData = regionalDistributionData.map((d) => ({
    ...d,
    color: regionColors[d.name] || d.color
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center space-x-2.5 mb-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart2 className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Applications by Region
        </h2>
      </div>

      {/* Chart & Legend Flex Container */}
      <div className="flex items-center gap-2.5 sm:gap-4 my-auto min-w-0">
        {/* Left: Perfectly circular donut chart with guaranteed fit and zero clipping */}
        <div className="w-[108px] sm:w-[124px] h-[108px] sm:h-[124px] shrink-0 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${value.toLocaleString()} Applications`,
                  name
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="54%"
                outerRadius="88%"
                paddingAngle={3}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={1.5}
                onClick={(entry: any) => {
                  if (entry && entry.name) {
                    navigate(
                      `/applications?region=${encodeURIComponent(
                        String(entry.name)
                      )}`
                    );
                  }
                }}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text inside Donut Hole */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-base sm:text-lg font-black text-slate-900 leading-none tracking-tight">
              5,482
            </span>
            <span className="text-[9px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>

        {/* Right: Legend List with full words, no truncation, no collisions */}
        <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
          {chartData.map((reg) => (
            <div
              key={reg.name}
              onClick={() =>
                navigate(
                  `/applications?region=${encodeURIComponent(reg.name)}`
                )
              }
              className="flex items-center justify-between text-xs cursor-pointer group hover:bg-slate-50/80 py-0.5 px-1 rounded transition-colors"
            >
              {/* Region Label with Dot - NO truncation, full readable text */}
              <div className="flex items-center space-x-1.5 min-w-0 mr-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: reg.color }}
                />
                <span className="text-slate-700 font-medium group-hover:text-blue-600 transition-colors whitespace-nowrap text-[11px] sm:text-xs">
                  {reg.name}
                </span>
              </div>

              {/* Number and Percentage: Guaranteed Single Line */}
              <div className="shrink-0 text-right whitespace-nowrap text-[11px] sm:text-xs pl-1">
                <span className="font-bold text-slate-900">
                  {reg.value.toLocaleString()}
                </span>{' '}
                <span className="text-slate-400 font-normal">
                  ({reg.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

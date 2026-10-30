import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const RegionalDonutChart: React.FC = () => {
  const navigate = useNavigate();

  // Regional breakdown data matching the reference design exactly
  const chartData = [
    { name: 'Northern', value: 1040, percentage: 17, color: '#2563eb' },
    { name: 'Southern', value: 1036, percentage: 19, color: '#0ea5e9' },
    { name: 'Eastern', value: 842, percentage: 15, color: '#8b5cf6' },
    { name: 'Western', value: 721, percentage: 13, color: '#f59e0b' },
    { name: 'Central', value: 531, percentage: 9, color: '#0d9488' },
    { name: 'North Eastern', value: 364, percentage: 6, color: '#f43f5e' },
    { name: 'Others', value: 256, percentage: 4, color: '#64748b' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center space-x-2 mb-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart2 className="w-4 h-4" />
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Applications by Region
        </h2>
      </div>

      {/* Chart & Legend Flex Container */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 my-auto min-w-0">
        {/* Left: Perfectly circular compact donut chart with zero clipping */}
        <div className="w-[84px] sm:w-[92px] h-[84px] sm:h-[92px] shrink-0 relative flex items-center justify-center">
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
                  fontSize: '11px',
                  fontWeight: 500
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
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
            <span className="text-xs sm:text-[13px] font-black text-slate-900 leading-none tracking-tight">
              5,482
            </span>
            <span className="text-[7px] sm:text-[8px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>

        {/* Right: Legend List - strictly separated columns with ZERO overlap and ZERO truncation */}
        <div className="flex-1 min-w-0 space-y-1">
          {chartData.map((reg) => (
            <div
              key={reg.name}
              onClick={() =>
                navigate(
                  `/applications?region=${encodeURIComponent(reg.name)}`
                )
              }
              className="flex items-center justify-between text-xs cursor-pointer group hover:bg-slate-50/80 py-0.5 px-1 rounded transition-colors min-w-0"
            >
              {/* Region Label with Dot - full name displayed */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: reg.color }}
                />
                <span className="text-slate-700 font-medium group-hover:text-blue-600 transition-colors whitespace-nowrap text-[10px] sm:text-[11px]">
                  {reg.name}
                </span>
              </div>

              {/* Number and Percentage */}
              <div className="shrink-0 text-right whitespace-nowrap text-[10px] sm:text-[11px] font-medium text-slate-800 pl-2">
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

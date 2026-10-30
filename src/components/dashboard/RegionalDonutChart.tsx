import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';

export const RegionalDonutChart: React.FC = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Regional breakdown data matching AICTE zonal regions
  const chartData = [
    { name: 'Northern', value: 1040, percentage: 17, color: '#2563eb' },
    { name: 'Southern', value: 1036, percentage: 19, color: '#0ea5e9' },
    { name: 'Eastern', value: 842, percentage: 15, color: '#8b5cf6' },
    { name: 'Western', value: 721, percentage: 13, color: '#f59e0b' },
    { name: 'Central', value: 531, percentage: 9, color: '#0d9488' },
    { name: 'North Eastern', value: 364, percentage: 6, color: '#f43f5e' },
    { name: 'Others', value: 256, percentage: 4, color: '#64748b' }
  ];

  const totalApplications = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart2 className="w-4 h-4" />
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Applications by Region
        </h2>
      </div>

      {/* Chart & Legend Flex Container */}
      <div className="flex items-center gap-3 sm:gap-4 my-auto min-w-0">
        {/* Left: Perfectly circular donut chart with fixed width/height - zero clipping */}
        <div className="w-[124px] h-[124px] shrink-0 relative flex items-center justify-center">
          <PieChart width={124} height={124}>
            <Pie
              data={chartData}
              cx={62}
              cy={62}
              innerRadius={38}
              outerRadius={56}
              paddingAngle={2.5}
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={1.5}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
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
              {chartData.map((entry, index) => {
                const isHovered = activeIndex === index;
                const isAnyHovered = activeIndex !== null;
                return (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.color}
                    opacity={!isAnyHovered || isHovered ? 1 : 0.35}
                    stroke={isHovered ? entry.color : '#ffffff'}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-150 cursor-pointer outline-none"
                  />
                );
              })}
            </Pie>
          </PieChart>

          {/* Center Text inside Donut Hole - Pixel-perfect alignment */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-1">
            <span className="text-xs sm:text-sm font-black text-slate-900 leading-none tracking-tight transition-all duration-150">
              {activeItem
                ? activeItem.value.toLocaleString()
                : totalApplications.toLocaleString()}
            </span>
            <span
              className="text-[7.5px] sm:text-[8px] font-bold uppercase tracking-wider mt-0.5 transition-all duration-150 truncate max-w-[70px]"
              style={{ color: activeItem ? activeItem.color : '#94a3b8' }}
            >
              {activeItem ? activeItem.name : 'Total'}
            </span>
            {activeItem && (
              <span className="text-[7px] sm:text-[7.5px] font-semibold text-slate-400 leading-none mt-0.5">
                ({activeItem.percentage}%)
              </span>
            )}
          </div>
        </div>

        {/* Right: Legend List with bidirectional hover highlighting */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {chartData.map((reg, index) => {
            const isHovered = activeIndex === index;
            return (
              <div
                key={reg.name}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() =>
                  navigate(
                    `/applications?region=${encodeURIComponent(reg.name)}`
                  )
                }
                className={`flex items-center justify-between gap-1 text-xs cursor-pointer group py-0.5 px-1.5 rounded transition-all min-w-0 ${
                  isHovered
                    ? 'bg-slate-100 shadow-2xs font-semibold'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Region Label with Dot */}
                <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                  <span
                    className={`rounded-full shrink-0 transition-transform ${
                      isHovered ? 'w-2 h-2 scale-125' : 'w-1.5 h-1.5'
                    }`}
                    style={{ backgroundColor: reg.color }}
                  />
                  <span
                    className={`truncate text-[10px] sm:text-[11px] transition-colors ${
                      isHovered
                        ? 'text-blue-700 font-bold'
                        : 'text-slate-700 font-medium group-hover:text-blue-600'
                    }`}
                  >
                    {reg.name}
                  </span>
                </div>

                {/* Number and Percentage */}
                <div className="shrink-0 text-right whitespace-nowrap text-[10px] sm:text-[11px] font-medium text-slate-800 ml-auto">
                  <span
                    className={`transition-colors ${
                      isHovered ? 'font-bold text-blue-700' : 'font-bold text-slate-900'
                    }`}
                  >
                    {reg.value.toLocaleString()}
                  </span>{' '}
                  <span
                    className={`transition-colors ${
                      isHovered ? 'text-blue-500 font-medium' : 'text-slate-400 font-normal'
                    }`}
                  >
                    ({reg.percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

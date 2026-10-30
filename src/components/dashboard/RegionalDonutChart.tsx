import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { regionalDistributionData } from '../../data/initialData';

export const RegionalDonutChart: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">
            Applications by Region
          </h2>
        </div>
        <button
          onClick={() => navigate('/regions-officials')}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          View Offices →
        </button>
      </div>

      {/* Chart & Legend Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center my-auto">
        {/* Donut Chart with Center Label */}
        <div className="sm:col-span-6 relative flex items-center justify-center h-44 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value: any, name: any) => [`${value.toLocaleString()} Applications`, name]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              />
              <Pie
                data={regionalDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                onClick={(entry: any) => {
                  if (entry && entry.name) {
                    navigate(`/applications?region=${encodeURIComponent(String(entry.name))}`);
                  }
                }}
              >
                {regionalDistributionData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              5,482
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="sm:col-span-6 space-y-1.5 pl-1">
          {regionalDistributionData.map((reg) => (
            <div
              key={reg.name}
              onClick={() => navigate(`/applications?region=${encodeURIComponent(reg.name)}`)}
              className="flex items-center justify-between text-xs cursor-pointer group hover:bg-slate-50 p-1 rounded-md transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: reg.color }}
                />
                <span className="text-slate-700 font-medium group-hover:text-blue-600 transition-colors">
                  {reg.name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-800">
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export const StageMovementChart: React.FC = () => {
  const navigate = useNavigate();

  // Stage data matching the reference image exactly
  const stageData = [
    { name: 'Application Submitted', count: 1482, percentage: 27, color: '#3b82f6' },
    { name: 'Expert Visit Committee (EVC)', count: 1035, percentage: 19, color: '#0ea5e9' },
    { name: 'Scrutiny / Re-scrutiny', count: 842, percentage: 15, color: '#0d9488' },
    { name: 'Approval Seeker Undertaking', count: 721, percentage: 13, color: '#f59e0b' },
    { name: 'Final Approval', count: 531, percentage: 9, color: '#10b981' },
    { name: 'Other Stages', count: 480, percentage: 9, color: '#94a3b8' }
  ];

  const maxPercentage = 30; // Scale relative to 27% max

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header with icon matching reference */}
      <div className="flex items-center space-x-2 mb-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Application Movement (Stage-wise)
        </h2>
      </div>

      {/* Stage Bars List */}
      <div className="space-y-2.5 sm:space-y-3 my-auto min-w-0">
        {stageData.map((stage) => {
          const widthPercent = (stage.percentage / maxPercentage) * 100;

          return (
            <div
              key={stage.name}
              onClick={() =>
                navigate(`/applications?stage=${encodeURIComponent(stage.name)}`)
              }
              className="flex items-center text-xs group cursor-pointer min-w-0"
            >
              {/* Stage Label - full name displayed */}
              <div className="w-36 sm:w-42 shrink-0 text-slate-700 font-medium whitespace-nowrap pr-2 group-hover:text-blue-600 transition-colors text-[11px] sm:text-xs">
                {stage.name}
              </div>

              {/* Progress Bar Container */}
              <div className="flex-1 min-w-[40px] h-2.5 sm:h-3 bg-slate-100 rounded-sm overflow-hidden mr-2 sm:mr-3">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>

              {/* Count & Percentage */}
              <div className="shrink-0 text-right font-medium text-slate-800 whitespace-nowrap text-[10px] sm:text-[11px] pl-1">
                <span className="font-bold">{stage.count.toLocaleString()}</span>{' '}
                <span className="text-slate-400 font-normal">
                  ({stage.percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

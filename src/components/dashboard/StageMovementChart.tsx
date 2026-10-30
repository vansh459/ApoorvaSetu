import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { stageMovementData } from '../../data/initialData';

export const StageMovementChart: React.FC = () => {
  const navigate = useNavigate();

  // Max percentage to scale bars relative to width
  const maxPercentage = 30; // 27% is highest

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header with icon matching reference */}
      <div className="flex items-center space-x-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">
          Application Movement (Stage-wise)
        </h2>
      </div>

      {/* Stage Bars List */}
      <div className="space-y-4 my-auto">
        {stageMovementData.map((stage) => {
          const widthPercent = (stage.percentage / maxPercentage) * 100;

          return (
            <div
              key={stage.name}
              onClick={() =>
                navigate(`/applications?stage=${encodeURIComponent(stage.name)}`)
              }
              className="flex items-center text-xs group cursor-pointer"
            >
              {/* Stage Label */}
              <div className="w-36 sm:w-44 shrink-0 text-slate-700 font-medium truncate pr-2 group-hover:text-blue-600 transition-colors">
                {stage.name}
              </div>

              {/* Progress Bar Container */}
              <div className="flex-1 min-w-[80px] h-3 bg-slate-100 rounded-sm overflow-hidden mr-3">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>

              {/* Count & Percentage */}
              <div className="w-20 shrink-0 text-right font-medium text-slate-800">
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { stageMovementData } from '../../data/initialData';

export const StageMovementChart: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">
            Application Movement (Stage-wise)
          </h2>
        </div>
        <button
          onClick={() => navigate('/workflow')}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          View Pipeline →
        </button>
      </div>

      {/* Stage Bars */}
      <div className="space-y-3.5 my-auto">
        {stageMovementData.map((stage) => {
          return (
            <div
              key={stage.name}
              onClick={() => navigate(`/applications?stage=${encodeURIComponent(stage.name)}`)}
              className="group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                  {stage.name}
                </span>
                <span className="font-bold text-slate-800">
                  {stage.count.toLocaleString()}{' '}
                  <span className="font-medium text-slate-400">({stage.percentage}%)</span>
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                  style={{
                    width: `${Math.min(100, stage.percentage * 3.2)}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

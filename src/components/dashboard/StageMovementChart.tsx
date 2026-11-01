import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterApplicationsForUser } from '../../services/rbacService';
import { authService } from '../../services/authService';
import { resolveWorkflowConfig } from '../../workflow/config';
import { stagePendency } from '../../workflow/selectors';
import { getNow } from '../../utils/dates';

export const StageMovementChart: React.FC = () => {
  const navigate = useNavigate();
  const { applications } = useApp();
  const { user } = useAuth();

  const scoped = filterApplicationsForUser(applications, user);
  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const rows = stagePendency(scoped, config, getNow()).filter((row) => row.count > 0);
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between h-full min-w-0">
      <div className="flex items-center space-x-2 mb-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          Applications by stage
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 my-auto py-6 text-center">
          No applications are in the pipeline.
        </p>
      ) : (
        <div className="space-y-2.5 my-auto min-w-0">
          {rows.map((stage) => (
            <div
              key={stage.stage}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/applications?stage=${encodeURIComponent(stage.stage)}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/applications?stage=${encodeURIComponent(stage.stage)}`);
                }
              }}
              className="group flex items-center text-xs cursor-pointer min-w-0 py-0.5 px-1.5 rounded-lg hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <div className="w-28 sm:w-32 shrink-0 text-slate-700 font-medium pr-2 group-hover:text-blue-600 text-[11px] sm:text-xs truncate">
                {stage.shortLabel}
              </div>

              <div className="flex-1 min-w-[36px] h-2 bg-slate-100 rounded-full overflow-hidden mr-2 sm:mr-3">
                <div
                  className="h-full rounded-full animate-bar-fill"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, 4)}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>

              <div className="shrink-0 text-right font-medium text-slate-800 whitespace-nowrap text-[10px] sm:text-[11px] pl-1 tabular-nums">
                <span className="font-bold">{stage.count.toLocaleString()}</span>{' '}
                <span className="text-slate-400 font-normal">({stage.share}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

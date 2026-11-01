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
import { Card, ProgressBar } from '../ui';

export const StageMovementChart: React.FC = () => {
  const navigate = useNavigate();
  const { applications } = useApp();
  const { user } = useAuth();

  const scoped = filterApplicationsForUser(applications, user);
  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const rows = stagePendency(scoped, config, getNow()).filter((row) => row.count > 0);

  return (
    <Card padded="none" className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <BarChart3 className="h-4 w-4 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">Applications by stage</h2>
      </div>

      {rows.length === 0 ? (
        <p className="my-auto px-5 py-10 text-center text-sm text-ink-2">
          No applications are in the pipeline.
        </p>
      ) : (
        <div className="my-auto min-w-0 space-y-4 px-5 py-5">
          {rows.map((stage) => (
            <button
              key={stage.stage}
              type="button"
              onClick={() => navigate(`/applications?stage=${encodeURIComponent(stage.stage)}`)}
              className="group block w-full min-w-0 rounded-control text-left"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-ink transition-colors duration-150 group-hover:text-accent">
                  {stage.shortLabel}
                </span>
                <span className="shrink-0 tabular-nums text-ink-2">
                  <span className="font-semibold text-ink">{stage.count.toLocaleString()}</span>{' '}
                  ({stage.share}%)
                </span>
              </div>
              <ProgressBar
                value={stage.share}
                label={`${stage.shortLabel}: ${stage.count}`}
                className="h-1"
              />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

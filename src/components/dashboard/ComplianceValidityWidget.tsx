import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterDocumentsForUser, filterUndertakingsForUser } from '../../services/rbacService';
import { authService } from '../../services/authService';
import { resolveWorkflowConfig } from '../../workflow/config';
import { complianceSnapshot } from '../../workflow/selectors';
import { getNow } from '../../utils/dates';
import { Card } from '../ui';

export const ComplianceValidityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { undertakings, documents } = useApp();
  const { user } = useAuth();

  const config = resolveWorkflowConfig(authService.getSystemConfig());
  const snapshot = complianceSnapshot(
    filterUndertakingsForUser(undertakings, user),
    filterDocumentsForUser(documents, user),
    config,
    getNow()
  );

  const complianceItems = [
    { label: 'Undertakings overdue', count: snapshot.undertakings.overdue, path: '/compliance' },
    { label: 'Evidence to verify', count: snapshot.undertakings.submitted, path: '/compliance' },
    { label: 'Documents expiring', count: snapshot.documents.expiringSoon, path: '/documents' },
    { label: 'Documents expired', count: snapshot.documents.expired, path: '/documents' },
    { label: 'Documents in force', count: snapshot.documents.valid, path: '/documents' }
  ];

  return (
    <Card padded="none" className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="text-sm font-semibold leading-snug text-ink">Compliance validity</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/compliance')}
          className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
        >
          View all
        </button>
      </div>

      <div className="my-auto min-w-0 space-y-0.5 px-3 py-3">
        {complianceItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.path)}
            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
          >
            <span className="truncate text-sm text-ink-2">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{item.count}</span>
          </button>
        ))}
      </div>
    </Card>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, Search, UploadCloud, FileText, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card } from '../ui';

export const QuickActionsPanel: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveModal } = useApp();

  const actions = [
    { label: 'Schedule EVC visit', icon: Calendar, action: () => setActiveModal('schedule-evc') },
    { label: 'Track application', icon: Search, action: () => setActiveModal('track-app') },
    { label: 'Upload compliance', icon: UploadCloud, action: () => setActiveModal('upload-compliance') },
    { label: 'Pending undertakings', icon: FileText, action: () => navigate('/compliance') },
    { label: 'Generate report', icon: FileSpreadsheet, action: () => setActiveModal('generate-report') }
  ];

  return (
    <Card padded="none" className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <Zap className="h-4 w-4 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
      </div>

      <div className="my-auto min-w-0 space-y-1.5 px-4 py-4">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.label}
              variant="ghost"
              fullWidth
              icon={<Icon className="h-4 w-4" strokeWidth={1.75} />}
              onClick={item.action}
              className="justify-start font-medium"
            >
              <span className="truncate">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

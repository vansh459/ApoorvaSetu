import React from 'react';
import { FileText, Users, ArrowDownCircle, CheckCircle } from 'lucide-react';

export const BottomInfoCards: React.FC = () => {
  const cards = [
    {
      title: 'Unified Platform',
      description: 'Single view of all approvals and activities',
      icon: FileText
    },
    {
      title: 'Better Coordination',
      description: 'Seamless collaboration across stakeholders',
      icon: Users
    },
    {
      title: 'Real-Time Tracking',
      description: 'Live status updates and notifications',
      icon: ArrowDownCircle
    },
    {
      title: 'Timely Approvals',
      description: 'Faster processing and reduced delays',
      icon: CheckCircle
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center space-x-3.5 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 leading-snug">
                {card.title}
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                {card.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

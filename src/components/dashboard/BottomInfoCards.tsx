import React from 'react';
import { Layers, MessageSquare, Target, ShieldCheck } from 'lucide-react';

export const BottomInfoCards: React.FC = () => {
  const cards = [
    {
      title: 'Unified Platform',
      description: 'Single view for all stages, regions and officials',
      icon: Layers
    },
    {
      title: 'Better Coordination',
      description: 'Seamless follow-up and communication',
      icon: MessageSquare
    },
    {
      title: 'Real-time Tracking',
      description: 'Monitor pendency, EVCs and compliance',
      icon: Target
    },
    {
      title: 'Timely Approvals',
      description: 'Supports quality technical education',
      icon: ShieldCheck
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
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 stroke-[2]" />
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

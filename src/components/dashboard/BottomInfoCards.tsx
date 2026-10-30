import React from 'react';
import { Layers, MessageSquareCode, Target, ShieldCheck } from 'lucide-react';

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
      icon: MessageSquareCode
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
            className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center space-x-3.5 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50/90 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-800 leading-snug">
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

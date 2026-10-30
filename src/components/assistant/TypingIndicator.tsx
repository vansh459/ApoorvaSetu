import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start space-x-2.5 my-3 justify-start animate-fade-in">
      {/* Bot Avatar */}
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
        <Bot className="w-4 h-4" />
      </div>

      {/* Typing Bubble */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center space-x-1.5">
        <span className="text-[11px] text-slate-400 font-medium mr-1.5">Analyzing AICTE guidelines</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
      </div>
    </div>
  );
};

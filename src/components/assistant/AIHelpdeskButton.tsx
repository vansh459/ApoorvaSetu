import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface AIHelpdeskButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const AIHelpdeskButton: React.FC<AIHelpdeskButtonProps> = ({
  isOpen,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center">
      {/* Tooltip on hover */}
      {!isOpen && isHovered && (
        <div className="mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700/80 animate-in fade-in slide-in-from-right-2 duration-150 whitespace-nowrap hidden sm:flex items-center space-x-1.5">
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span>Ask ApoorvaSetu Assistant</span>
        </div>
      )}

      {/* Floating Circular Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Ask ApoorvaSetu Assistant"
        title="Ask ApoorvaSetu Assistant"
        className={`group relative w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-slate-900 ring-4 ring-blue-500/20 shadow-blue-500/20'
            : 'bg-gradient-to-tr from-blue-600 via-blue-700 to-teal-500 hover:from-blue-700 hover:to-teal-600 shadow-blue-600/30 ring-4 ring-white/80'
        }`}
      >
        {/* Glow Ring Effect */}
        <span className="absolute inset-0 rounded-full bg-blue-500 opacity-20 blur-md group-hover:opacity-40 transition-opacity" />

        {/* Icon */}
        <div className="relative flex items-center justify-center">
          <Bot className="w-6 h-6 transition-transform group-hover:scale-110" />
          <Sparkles className="w-3 h-3 text-teal-200 absolute -top-1.5 -right-1.5 animate-pulse" />
        </div>

        {/* Active Online / Notification Pulse Indicator */}
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
        </span>
      </button>
    </div>
  );
};


import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex w-full my-2.5 justify-start animate-message-in">
      <div className="bg-slate-100 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
      </div>
    </div>
  );
};

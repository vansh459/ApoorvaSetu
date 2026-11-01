import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="my-2.5 flex w-full justify-start">
      <div className="flex items-center gap-1.5 rounded-card rounded-tl-xs bg-surface-2 px-3.5 py-2.5 shadow-raise">
        <span className="h-1.5 w-1.5 rounded-pill bg-ink-3 animate-pulse [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-pill bg-ink-3 animate-pulse [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-pill bg-ink-3 animate-pulse" />
      </div>
    </div>
  );
};

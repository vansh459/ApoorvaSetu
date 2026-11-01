import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessageItem } from '../../services/assistantService';

interface ChatMessageProps {
  message: ChatMessageItem;
  onActionClick?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onActionClick }) => {
  const navigate = useNavigate();
  const isAssistant = message.sender === 'assistant';

  const handleActionNavigate = (path: string) => {
    navigate(path);
    if (onActionClick) {
      onActionClick();
    }
  };

  // Clean markdown-like formatter for bolding, bullet points, and paragraphs
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check for bullet point
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;

      // Parse bold segments (**bold**)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong
              key={pIdx}
              className={`font-semibold ${isAssistant ? 'text-ink' : 'text-white'}`}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="my-0.5 ml-4 list-disc text-xs leading-relaxed">
            {renderedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="my-0.5 text-xs leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div className={`my-2.5 flex w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-card px-3.5 py-2.5 text-xs shadow-raise ${
          isAssistant
            ? message.isError
              ? 'rounded-tl-xs bg-warning-soft text-warning'
              : 'rounded-tl-xs bg-surface-2 text-ink'
            : 'rounded-tr-xs bg-action text-white'
        }`}
      >
        <div className="leading-relaxed">
          {renderFormattedText(message.text)}
        </div>

        {isAssistant && message.actionLinks && message.actionLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
            {message.actionLinks.map((link, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleActionNavigate(link.path)}
                className="inline-flex items-center gap-1 rounded-pill bg-surface px-2.5 py-1 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent-soft active:scale-95"
              >
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        )}

        <div
          className={`mt-1 text-xs ${
            isAssistant ? 'text-left text-ink-2' : 'text-right text-white/70'
          }`}
        >
          {message.timestamp}
        </div>
      </div>
    </div>
  );
};

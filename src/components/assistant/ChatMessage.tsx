import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
              className={`font-semibold ${isAssistant ? 'text-slate-900' : 'text-white'}`}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed my-0.5">
            {renderedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed my-0.5">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div className={`flex w-full my-2.5 animate-message-in ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-xs transition-all ${
          isAssistant
            ? message.isError
              ? 'bg-amber-50/90 border border-amber-200 text-amber-900 rounded-2xl rounded-tl-xs shadow-2xs'
              : 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-xs shadow-2xs'
            : 'bg-blue-600 text-white rounded-2xl rounded-tr-xs shadow-xs'
        }`}
      >
        {/* Message Text */}
        <div className="leading-relaxed">
          {renderFormattedText(message.text)}
        </div>

        {/* Action Link Pills */}
        {isAssistant && message.actionLinks && message.actionLinks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
            {message.actionLinks.map((link, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleActionNavigate(link.path)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 active:scale-95 text-[11px] font-medium transition-all duration-150 cursor-pointer shadow-2xs group"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform duration-150" />
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[9px] mt-1 ${
            isAssistant ? 'text-slate-400 text-left' : 'text-blue-200 text-right'
          }`}
        >
          {message.timestamp}
        </div>
      </div>
    </div>
  );
};

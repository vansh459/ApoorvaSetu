import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, User as UserIcon, ArrowRight, ExternalLink } from 'lucide-react';
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

  // Simple, clean markdown-like formatter for bolding, bullet points, and line breaks
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
            <strong key={pIdx} className="font-semibold text-slate-900">
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
    <div
      className={`flex items-start space-x-2.5 my-3 ${
        isAssistant ? 'justify-start' : 'justify-end flex-row-reverse space-x-reverse'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
          isAssistant
            ? 'bg-gradient-to-br from-blue-600 to-teal-500 text-white'
            : 'bg-slate-800 text-slate-200'
        }`}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <UserIcon className="w-3.5 h-3.5" />}
      </div>

      {/* Message Content Container */}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
          isAssistant
            ? 'bg-white border border-slate-200/90 text-slate-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
        }`}
      >
        {/* Text content */}
        <div className={isAssistant ? 'text-slate-700' : 'text-white'}>
          {isAssistant ? (
            <div className="space-y-0.5">{renderFormattedText(message.text)}</div>
          ) : (
            <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.text}</p>
          )}
        </div>

        {/* Action navigation links/buttons */}
        {isAssistant && message.actionLinks && message.actionLinks.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
            {message.actionLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={() => handleActionNavigate(link.path)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200/60 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs group"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[9px] mt-1.5 font-medium ${
            isAssistant ? 'text-slate-400 text-right' : 'text-blue-100 text-right'
          }`}
        >
          {message.timestamp}
        </div>
      </div>
    </div>
  );
};

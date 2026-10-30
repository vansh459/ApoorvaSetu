import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-adjust textarea height up to 100px
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200/90">
      <div className="relative flex items-end bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-2xl p-1.5 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about approvals, EVC, compliance..."
          disabled={disabled}
          className="w-full bg-transparent resize-none outline-none text-xs text-slate-800 placeholder-slate-400 px-2.5 py-1.5 max-h-24 leading-relaxed"
        />

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="shrink-0 p-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-teal-600 text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs"
        >
          <SendHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
        <span>Enter to send • Shift+Enter for new line</span>
        <span>ApoorvaSetu AI</span>
      </div>
    </form>
  );
};

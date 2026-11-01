import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

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
    // Auto-adjust textarea height up to 96px
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-line bg-surface px-3 py-2.5">
      <div className="flex items-end gap-2 rounded-card bg-surface-2 px-3 py-2 transition-shadow duration-150 focus-within:shadow-raise">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this screen"
          disabled={disabled}
          aria-label="Message the ApoorvaSetu assistant"
          className="max-h-24 w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
        />

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-action text-white transition-[background-color,transform] duration-150 ease-swift hover:bg-action-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { RotateCcw, Sparkles, X } from 'lucide-react';
import { IconButton } from '../ui';
import { useAuth } from '../../context/AuthContext';
import {
  assistantService,
  ChatMessageItem
} from '../../services/assistantService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { TypingIndicator } from './TypingIndicator';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load message history for active user or initialize with welcome message
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      const remote = await assistantService.loadRemoteHistory(user?.id);
      if (cancelled) return;

      const saved = remote ?? assistantService.loadHistory(user?.id);
      if (saved && saved.length > 0) {
        setMessages(saved);
        return;
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const initialGreeting: ChatMessageItem = {
        id: `msg-init-${Date.now()}`,
        sender: 'assistant',
        text: `Hello, **${user?.name || 'User'}**! How can I assist you with ApoorvaSetu today?`,
        timestamp: now
      };
      setMessages([initialGreeting]);
      assistantService.saveHistory([initialGreeting], user?.id);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, user?.name, user?.roleTitle]);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = async (text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeStr
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    assistantService.saveHistory(updatedWithUser, user?.id);
    setIsThinking(true);

    try {
      const response = await assistantService.processMessage(text, user, location.pathname, messages);

      const assistantMsg: ChatMessageItem = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionLinks: response.actionLinks,
        isError: response.isError
      };

      const finalMessages = [...updatedWithUser, assistantMsg];
      setMessages(finalMessages);
      assistantService.saveHistory(finalMessages, user?.id);
    } catch {
      const errorMsg: ChatMessageItem = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: 'I encountered a temporary issue. Please try asking again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleResetConversation = () => {
    assistantService.clearHistory(user?.id);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const freshGreeting: ChatMessageItem = {
      id: `msg-init-${Date.now()}`,
      sender: 'assistant',
      text: 'Conversation reset. How can I help you today?',
      timestamp: now
    };
    setMessages([freshGreeting]);
    assistantService.saveHistory([freshGreeting], user?.id);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="ApoorvaSetu assistant"
      className="panel-enter fixed bottom-6 right-4 z-50 flex h-[540px] max-h-[80vh] w-[92vw] flex-col overflow-hidden rounded-modal border border-line bg-surface/95 shadow-overlay backdrop-blur-xl sm:right-6 sm:w-[390px]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
          <h3 className="text-sm font-semibold tracking-tight text-ink">ApoorvaSetu assistant</h3>
        </div>

        <div className="flex items-center gap-0.5">
          <IconButton label="Start a new conversation" size="sm" onClick={handleResetConversation}>
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Close assistant" size="sm" onClick={onClose}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto bg-surface px-3.5 py-2.5">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <SuggestedQuestions
        currentPath={location.pathname}
        onSelectQuestion={handleSendMessage}
      />

      <ChatInput onSendMessage={handleSendMessage} disabled={isThinking} />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  X,
  Minus,
  RotateCcw
} from 'lucide-react';
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
  onMinimize: () => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  onMinimize
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load message history for active user or initialize with welcome message
  useEffect(() => {
    if (!isOpen) return;

    const saved = assistantService.loadHistory(user?.id);
    if (saved && saved.length > 0) {
      setMessages(saved);
    } else {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const initialGreeting: ChatMessageItem = {
        id: `msg-init-${Date.now()}`,
        sender: 'assistant',
        text: `Hello, **${user?.name || 'User'}**! How can I assist you with ApoorvaSetu today?`,
        timestamp: now
      };
      setMessages([initialGreeting]);
      assistantService.saveHistory([initialGreeting], user?.id);
    }
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
        text: "I encountered a temporary issue. Please try asking again.",
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
      text: `Conversation reset. How can I help you today?`,
      timestamp: now
    };
    setMessages([freshGreeting]);
    assistantService.saveHistory([freshGreeting], user?.id);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="ApoorvaSetu Assistant"
      className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[390px] h-[540px] max-h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-200/90 flex flex-col overflow-hidden animate-chat-panel"
    >
      {/* Minimal Header */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">ApoorvaSetu</h3>
        </div>

        {/* Essential Window Controls */}
        <div className="flex items-center space-x-0.5 text-slate-400">
          <button
            onClick={handleResetConversation}
            title="New Conversation"
            className="p-1.5 hover:text-slate-700 hover:bg-slate-100 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer"
            aria-label="New conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMinimize}
            title="Minimize"
            className="p-1.5 hover:text-slate-700 hover:bg-slate-100 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer"
            aria-label="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 hover:text-slate-700 hover:bg-slate-100 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-1 bg-white">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Horizontal Suggested Questions Carousel */}
      <SuggestedQuestions
        currentPath={location.pathname}
        onSelectQuestion={handleSendMessage}
      />

      {/* Clean Message Input Area */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isThinking} />
    </div>
  );
};

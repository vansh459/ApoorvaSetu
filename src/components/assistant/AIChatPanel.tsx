import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot,
  X,
  Minus,
  RotateCcw,
  Sparkles,
  ShieldCheck
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
      const roleTitle = user?.roleTitle || 'Authorized User';
      const initialGreeting: ChatMessageItem = {
        id: `msg-init-${Date.now()}`,
        sender: 'assistant',
        text: `Hello, **${user?.name || 'User'}**! 👋\n\nI am your **ApoorvaSetu Helpdesk Assistant**. You are signed in as **${roleTitle}**.\n\nAsk me anything about approval workflows, inspection checklists, compliance undertakings, or platform navigation!`,
        timestamp: now,
        actionLinks: [
          { label: 'View Applications', path: '/applications' },
          { label: 'Approval Workflow', path: '/workflow' }
        ]
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
      // Small simulated natural latency (350 - 650ms)
      await new Promise((resolve) => setTimeout(resolve, 450));

      const response = await assistantService.processMessage(text, user, location.pathname);

      const assistantMsg: ChatMessageItem = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionLinks: response.actionLinks
      };

      const finalMessages = [...updatedWithUser, assistantMsg];
      setMessages(finalMessages);
      assistantService.saveHistory(finalMessages, user?.id);
    } catch {
      const errorMsg: ChatMessageItem = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: "I encountered a temporary issue retrieving the guideline. Please try asking again.",
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
      text: `Conversation reset. How can I help you with **ApoorvaSetu** today?`,
      timestamp: now
    };
    setMessages([freshGreeting]);
    assistantService.saveHistory([freshGreeting], user?.id);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="ApoorvaSetu Helpdesk Assistant"
      className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Premium Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 p-0.5 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            {/* Pulsing online status indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-bold tracking-tight text-white">ApoorvaSetu Assistant</h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                AICTE AI
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-slate-300">
              <ShieldCheck className="w-2.5 h-2.5 text-teal-400" />
              <span>Role: {user?.roleTitle || 'Authorized Officer'}</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-1 text-slate-300">
          <button
            onClick={handleResetConversation}
            title="Start New Conversation"
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMinimize}
            title="Minimize"
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Minimize chat"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close chat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Domain restriction banner */}
      <div className="px-3 py-1 bg-blue-50/70 border-b border-blue-100/60 flex items-center justify-between text-[10px] text-blue-800">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>Strictly restricted to ApoorvaSetu portal guidelines</span>
        </span>
        <span className="text-slate-400 font-mono">v2.6</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1 bg-slate-50/40">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <SuggestedQuestions
        currentPath={location.pathname}
        onSelectQuestion={handleSendMessage}
      />

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isThinking} />
    </div>
  );
};

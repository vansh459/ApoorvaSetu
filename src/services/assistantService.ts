import { User } from '../types/index.ts';
import { ActionLink } from '../data/platformKnowledgeBase.ts';
import { getDataMode } from './repositories/index.ts';
import { isSupabaseConfigured, supabase } from './supabaseClient.ts';

async function authHeaders(): Promise<Record<string, string>> {
  if (getDataMode() !== 'supabase' || !isSupabaseConfigured) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionLinks?: ActionLink[];
  isError?: boolean;
}

class AssistantService {
  /**
   * Process a user's question through the backend AI endpoint (POST /api/assistant/chat).
   * Generates dynamic responses using Google Gemini API grounded in actual platform documentation.
   */
  async processMessage(
    userMessage: string,
    currentUser: User | null,
    currentPath: string,
    existingHistory?: ChatMessageItem[]
  ): Promise<{ text: string; actionLinks?: ActionLink[]; isError?: boolean }> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      return { text: "Please enter a question about ApoorvaSetu." };
    }

    try {
      // Map existing messages into multi-turn chat history (excluding errors and greetings)
      const historyPayload = (existingHistory || [])
        .filter((m) => !m.isError && m.text.length > 2)
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text
        }));

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders())
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          userRole: currentUser?.role,
          currentPath
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        return {
          text: errorJson.text || errorJson.message || `**Server Error (${response.status})**: The AI service could not process the request.`,
          isError: true
        };
      }

      const data = await response.json();
      return {
        text: data.text,
        actionLinks: data.actionLinks,
        isError: data.isConfigError
      };
    } catch (err: any) {
      console.error('Failed to communicate with /api/assistant/chat:', err);
      return {
        text: "**Connection Error**: Unable to reach the ApoorvaSetu AI backend endpoint. Please ensure the backend server or Vite dev server is running.",
        isError: true
      };
    }
  }

  // --- Local Conversation History Storage (User-Isolated) ---

  getStorageKey(userId?: string): string {
    return `apoorvasetu_ai_chat_v2_${userId || 'guest'}`;
  }

  loadHistory(userId?: string): ChatMessageItem[] {
    try {
      const saved = localStorage.getItem(this.getStorageKey(userId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  saveHistory(messages: ChatMessageItem[], userId?: string): void {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(messages));
    } catch {}
  }

  clearHistory(userId?: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(userId));
    } catch {}
  }
}

export const assistantService = new AssistantService();

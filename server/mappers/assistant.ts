import type { AssistantMessage as AssistantMessageRow } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { optional } from './json.ts';

export interface AssistantMessageRecord {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  currentPath?: string;
}

export function toAssistantMessage(row: AssistantMessageRow): AssistantMessageRecord {
  return {
    id: row.id,
    sender: row.role === 'user' ? 'user' : 'assistant',
    text: row.content,
    timestamp: row.timestamp,
    currentPath: optional(row.currentPath)
  };
}

export function toAssistantMessageData(
  message: AssistantMessageRecord,
  userId: string
): Prisma.AssistantMessageUncheckedCreateInput {
  return {
    id: message.id,
    userId,
    role: message.sender,
    content: message.text,
    timestamp: message.timestamp,
    currentPath: message.currentPath ?? null
  };
}

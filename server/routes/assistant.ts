import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler, HttpError } from '../http.ts';
import { getPrisma } from '../db.ts';
import { requireSession } from '../session.ts';
import { optionalString, requireObject, requireString } from '../validate.ts';

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 4000;

interface HistoryMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

function parseMessages(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_BODY', 'messages must be an array.');
  }

  return value.slice(-MAX_MESSAGES).map((item) => {
    const message = requireObject(item, 'message');
    const sender = message.sender === 'assistant' ? 'assistant' : message.sender === 'user' ? 'user' : null;
    if (!sender) {
      throw new HttpError(400, 'INVALID_BODY', 'message.sender must be "user" or "assistant".');
    }
    return {
      id: optionalString(message.id, 'message.id', 120) ?? randomUUID(),
      sender,
      text: requireString(message.text, 'message.text', { min: 1, max: MAX_MESSAGE_LENGTH }),
      timestamp: optionalString(message.timestamp, 'message.timestamp', 40) ?? new Date().toISOString()
    };
  });
}

export const assistantRouter = Router();

assistantRouter.use(requireSession);

assistantRouter.get(
  '/assistant/history',
  asyncHandler(async (req, res) => {
    const rows = await getPrisma().assistantMessage.findMany({
      where: { userId: req.auth!.user.id },
      orderBy: { createdAt: 'asc' },
      take: MAX_MESSAGES
    });

    res.json({
      messages: rows.map((row) => ({
        id: row.id,
        sender: row.role === 'assistant' ? 'assistant' : 'user',
        text: row.content,
        timestamp: row.timestamp
      }))
    });
  })
);

assistantRouter.put(
  '/assistant/history',
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const messages = parseMessages(body.messages);
    const user = req.auth!.user;
    const currentPath = optionalString(body.currentPath, 'currentPath', 200) ?? null;
    const prisma = getPrisma();
    const base = Date.now();

    await prisma.$transaction([
      prisma.assistantMessage.deleteMany({ where: { userId: user.id } }),
      prisma.assistantMessage.createMany({
        data: messages.map((message, index) => ({
          id: message.id,
          userId: user.id,
          role: message.sender,
          content: message.text,
          timestamp: message.timestamp,
          currentPath,
          // Keep the conversation order stable regardless of clock resolution.
          createdAt: new Date(base + index)
        }))
      })
    ]);

    res.status(204).end();
  })
);

assistantRouter.delete(
  '/assistant/history',
  asyncHandler(async (req, res) => {
    await getPrisma().assistantMessage.deleteMany({ where: { userId: req.auth!.user.id } });
    res.status(204).end();
  })
);

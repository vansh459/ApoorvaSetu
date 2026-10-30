import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiService } from './aiService.ts';
import type { AIChatRequest } from './aiService.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ApoorvaSetu AI Assistant Backend',
    timestamp: new Date().toISOString()
  });
});

// Assistant Status Check (Config verification)
app.get('/api/assistant/status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    isConfigured: hasKey,
    provider: process.env.AI_PROVIDER || 'gemini',
    model: process.env.AI_MODEL || 'gemini-3-flash-preview'
  });
});

// Main AI Chat Endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, history, userRole, currentPath } = req.body as AIChatRequest;

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Message parameter is required and must be a string.'
      });
      return;
    }

    const result = await aiService.generateResponse({
      message,
      history,
      userRole,
      currentPath
    });

    if (result.isConfigError) {
      res.status(200).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Server error handling /api/assistant/chat:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      text: 'An internal server error occurred while processing the request.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[ApoorvaSetu AI Backend] Running on http://localhost:${PORT}`);
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  if (hasKey) {
    console.log(`[ApoorvaSetu AI Backend] Google Gemini API Key configured. Model: ${process.env.AI_MODEL || 'gemini-3-flash-preview'}`);
  } else {
    console.warn(`[ApoorvaSetu AI Backend] WARNING: GEMINI_API_KEY is not set in .env! Configure it to enable live AI responses.`);
  }
});

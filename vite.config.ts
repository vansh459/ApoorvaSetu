import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import dotenv from 'dotenv';
import { aiService } from './server/aiService.ts';

dotenv.config({ override: true });

function aiAssistantBackendPlugin(): Plugin {
  return {
    name: 'ai-assistant-backend-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        dotenv.config({ override: true });
        // Handle AI chat endpoint
        if (req.url?.startsWith('/api/assistant/chat') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = await aiService.generateResponse(data);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('Vite AI Middleware error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({
                error: 'AI_BACKEND_ERROR',
                text: `AI backend error: ${err.message}`
              }));
            }
          });
          return;
        }

        // Handle AI backend status endpoint
        if (req.url?.startsWith('/api/assistant/status') && req.method === 'GET') {
          const hasKey = Boolean(
            process.env.GEMINI_API_KEY &&
            process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
            process.env.GEMINI_API_KEY.length > 5
          );
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            isConfigured: hasKey,
            provider: process.env.AI_PROVIDER || 'gemini',
            model: process.env.AI_MODEL || 'gemini-3-flash-preview'
          }));
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), aiAssistantBackendPlugin()],
  server: {
    port: 5173
  }
});

import { aiService } from '../../server/aiService.ts';
import type { AIChatRequest } from '../../server/aiService.ts';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { message, history, userRole, currentPath } = req.body as AIChatRequest;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message parameter is required.' });
      return;
    }

    const result = await aiService.generateResponse({
      message,
      history,
      userRole,
      currentPath
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel serverless API error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      text: 'An error occurred while contacting the AI service.'
    });
  }
}

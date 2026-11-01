import { MAX_VERIFY_BODY_BYTES, verifyDocument } from '../../server/documentVerifier.ts';
import { corsHeaders, isOriginAllowed } from '../../server/authGuard.ts';

export default async function handler(req: any, res: any) {
  const headers = corsHeaders(req);
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' });
    return;
  }

  const origin = req.headers?.origin;
  if (typeof origin === 'string' && origin.length > 0 && !isOriginAllowed(origin)) {
    res.status(403).json({ error: 'FORBIDDEN_ORIGIN', message: 'This origin is not allowed to verify documents.' });
    return;
  }

  const declared = Number(req.headers?.['content-length']);
  if (Number.isFinite(declared) && declared > MAX_VERIFY_BODY_BYTES) {
    res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'The document exceeds the maximum upload size.' });
    return;
  }

  try {
    const result = await verifyDocument(req.body, req);
    res.status(result.status).json(result.payload);
  } catch (error) {
    console.error('Vercel document verification error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while verifying the document.'
    });
  }
}

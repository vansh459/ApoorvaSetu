import type { Request, Response } from 'express';

export type TableName =
  | 'applications'
  | 'evcVisits'
  | 'complianceRecords'
  | 'documents'
  | 'undertakings'
  | 'notifications'
  | 'alerts'
  | 'escalations'
  | 'auditLogs'
  | 'config'
  | 'users'
  | 'rolePermissions';

const KEEPALIVE_MS = 25_000;

const clients = new Set<Response>();
let revision = 0;

export function currentRevision(): number {
  return revision;
}

export function handleEvents(req: Request, res: Response): void {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  res.write(`event: ready\ndata: ${JSON.stringify({ rev: revision })}\n\n`);
  clients.add(res);

  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, KEEPALIVE_MS);

  const cleanup = () => {
    clearInterval(keepalive);
    clients.delete(res);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
}

export function broadcast(tables: readonly TableName[]): void {
  revision += 1;
  const frame = `event: change\ndata: ${JSON.stringify({ tables, rev: revision })}\n\n`;
  for (const client of clients) client.write(frame);
}

export function resetEventBus(): void {
  clients.clear();
  revision = 0;
}

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: code, text: message });
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof HttpError) {
    sendError(res, error.status, error.code, error.message);
    return;
  }

  console.error('Unhandled API error:', error);
  sendError(res, 500, 'INTERNAL', 'An unexpected server error occurred.');
};

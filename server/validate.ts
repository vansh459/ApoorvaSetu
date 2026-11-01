import { HttpError } from './http.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function requireObject(value: unknown, field = 'body'): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpError(400, 'INVALID_BODY', `${field} must be a JSON object.`);
  }
  return value;
}

export function requireString(
  value: unknown,
  field: string,
  options: { min?: number; max?: number } = {}
): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_BODY', `${field} must be a string.`);
  }
  const trimmed = value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 5000;
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(
      400,
      'INVALID_BODY',
      `${field} must be between ${min} and ${max} characters.`
    );
  }
  return trimmed;
}

export function optionalString(value: unknown, field: string, max = 5000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_BODY', `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return requireString(trimmed, field, { min: 0, max });
}

export function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

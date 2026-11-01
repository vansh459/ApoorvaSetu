import { randomUUID } from 'node:crypto';

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

export const MAX_STORAGE_KEY_LENGTH = 300;

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '');
  return (cleaned || 'file').slice(0, 80);
}

export function isStorageKey(key: string): boolean {
  if (!key || key.length > MAX_STORAGE_KEY_LENGTH) return false;
  if (key.includes('..') || key.startsWith('/')) return false;
  return key.split('/').every((segment) => SEGMENT.test(segment));
}

export function buildStorageKey(userId: string, fileName: string): string {
  return `u-${sanitizeFileName(userId)}/${randomUUID()}/${sanitizeFileName(fileName)}`;
}

export function fileNameFromKey(key: string): string {
  return key.split('/').pop() || key;
}

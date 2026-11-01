import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const digest = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, salt, digest] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !digest) return false;

  const expected = Buffer.from(digest, 'hex');
  if (expected.length === 0) return false;

  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(expected, actual);
}

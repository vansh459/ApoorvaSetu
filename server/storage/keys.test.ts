import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildStorageKey, fileNameFromKey, isStorageKey, sanitizeFileName } from './keys.ts';
import { LocalDiskStorage } from './local.ts';

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'apoorvasetu-storage-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('storage keys', () => {
  it('strips directories and unsafe characters from file names', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('Fire Safety Certificate (2026).pdf')).toBe(
      'Fire-Safety-Certificate-2026-.pdf'
    );
    expect(sanitizeFileName('...')).toBe('file');
    expect(sanitizeFileName('a'.repeat(200))).toHaveLength(80);
  });

  it('scopes new keys to the uploading user', () => {
    const key = buildStorageKey('USR-SUPERADMIN', 'Lease deed.pdf');
    expect(key.startsWith('u-USR-SUPERADMIN/')).toBe(true);
    expect(key.endsWith('/Lease-deed.pdf')).toBe(true);
    expect(isStorageKey(key)).toBe(true);
    expect(fileNameFromKey(key)).toBe('Lease-deed.pdf');
  });

  it('rejects traversal and malformed keys', () => {
    expect(isStorageKey('')).toBe(false);
    expect(isStorageKey('../secret')).toBe(false);
    expect(isStorageKey('u-1/../../etc/passwd')).toBe(false);
    expect(isStorageKey('/etc/passwd')).toBe(false);
    expect(isStorageKey('u-1//file.pdf')).toBe(false);
    expect(isStorageKey('u-1/space name.pdf')).toBe(false);
    expect(isStorageKey(`u-1/${'a'.repeat(400)}`)).toBe(false);
  });
});

describe('local disk storage', () => {
  it('writes, reads and deletes objects under its root', async () => {
    const root = await tempDir();
    const storage = new LocalDiskStorage(root);
    const key = buildStorageKey('USR-1', 'evidence.png');

    await storage.writeObject!(key, Buffer.from('hello'));
    expect(await storage.readObject!(key)).toEqual(Buffer.from('hello'));

    await storage.deleteObject(key);
    expect(await storage.readObject!(key)).toBeNull();
  });

  it('refuses keys that escape the upload directory', async () => {
    const root = await tempDir();
    const storage = new LocalDiskStorage(root);

    await expect(storage.writeObject!('../escape.txt', Buffer.from('x'))).rejects.toThrow(
      'Invalid storage key.'
    );
    expect(await storage.createDownloadUrl('u-1/file.pdf')).toBe(
      '/api/files/object?key=u-1%2Ffile.pdf'
    );
  });
});

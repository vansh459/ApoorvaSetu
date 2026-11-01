import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../http.ts';
import type { StorageAdapter, UploadTarget } from './types.ts';

export class LocalDiskStorage implements StorageAdapter {
  readonly driver = 'local';
  readonly bucket = 'local';
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(`${this.root}${path.sep}`)) {
      throw new HttpError(400, 'INVALID_KEY', 'Invalid storage key.');
    }
    return target;
  }

  async createUploadTarget({ key }: { key: string }): Promise<UploadTarget> {
    return {
      uploadUrl: `/api/files/object?key=${encodeURIComponent(key)}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' }
    };
  }

  async createDownloadUrl(key: string): Promise<string> {
    return `/api/files/object?key=${encodeURIComponent(key)}`;
  }

  async writeObject(key: string, body: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async readObject(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

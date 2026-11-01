export type StorageDriver = 'local' | 'supabase';

export interface UploadTarget {
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface StorageAdapter {
  readonly driver: StorageDriver;
  readonly bucket: string;

  /** Where the browser should PUT the raw file body. */
  createUploadTarget(input: { key: string; contentType: string }): Promise<UploadTarget>;

  /** Short-lived URL the browser can read the object from. */
  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;

  /** Local driver only: the server itself receives the bytes. */
  writeObject?(key: string, body: Buffer): Promise<void>;
  readObject?(key: string): Promise<Buffer | null>;

  deleteObject(key: string): Promise<void>;
}

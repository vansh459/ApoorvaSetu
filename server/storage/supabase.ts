import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../http.ts';
import type { StorageAdapter, UploadTarget } from './types.ts';

export class SupabaseStorage implements StorageAdapter {
  readonly driver = 'supabase';
  readonly bucket: string;
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string, bucket: string) {
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    this.bucket = bucket;
  }

  async createUploadTarget({
    key,
    contentType
  }: {
    key: string;
    contentType: string;
  }): Promise<UploadTarget> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(key, { upsert: false });
    if (error || !data) {
      throw new HttpError(
        503,
        'STORAGE_UNAVAILABLE',
        `Could not prepare the upload: ${error?.message ?? 'unknown storage error'}`
      );
    }
    return {
      uploadUrl: data.signedUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'x-upsert': 'false' }
    };
  }

  async createDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);
    if (error || !data) {
      throw new HttpError(
        404,
        'FILE_NOT_FOUND',
        `Could not open the stored file: ${error?.message ?? 'unknown storage error'}`
      );
    }
    return data.signedUrl;
  }

  async deleteObject(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new HttpError(503, 'STORAGE_UNAVAILABLE', `Could not delete the file: ${error.message}`);
    }
  }
}

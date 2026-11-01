import { HttpError } from '../http.ts';
import { LocalDiskStorage } from './local.ts';
import { SupabaseStorage } from './supabase.ts';
import type { StorageAdapter } from './types.ts';

const DEFAULT_MAX_UPLOAD_MB = 25;
const DEFAULT_BUCKET = 'institute-documents';

let adapter: StorageAdapter | null = null;

export function resetStorage(): void {
  adapter = null;
}

export function getStorage(): StorageAdapter {
  if (adapter) return adapter;

  const driver = (process.env.STORAGE_DRIVER || 'local').trim().toLowerCase();
  if (driver === 'supabase') {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new HttpError(
        503,
        'STORAGE_UNCONFIGURED',
        'Supabase Storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.'
      );
    }
    adapter = new SupabaseStorage(url, serviceKey, process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET);
    return adapter;
  }

  if (driver !== 'local') {
    throw new HttpError(503, 'STORAGE_UNCONFIGURED', `Unknown STORAGE_DRIVER "${driver}".`);
  }

  adapter = new LocalDiskStorage(process.env.UPLOAD_DIR || 'data/uploads');
  return adapter;
}

export function maxUploadBytes(): number {
  const configured = Number(process.env.UPLOAD_MAX_MB ?? DEFAULT_MAX_UPLOAD_MB);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_MB;
  return Math.floor(megabytes * 1024 * 1024);
}

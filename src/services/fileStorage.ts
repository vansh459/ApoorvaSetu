import { getDataMode } from './repositories/index.ts';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};

const ACCEPTED = new Set(Object.values(CONTENT_TYPES));

export type FileScope = 'document' | 'evidence';

export interface UploadedFile {
  key: string;
  fileName: string;
  size: string;
  type: string;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { text?: string; error?: string };
    return body.text ?? body.error ?? `Upload failed (${response.status}).`;
  } catch {
    return `Upload failed (${response.status}).`;
  }
}

function contentTypeOf(file: File): string {
  const declared = file.type.toLowerCase();
  if (ACCEPTED.has(declared)) return declared;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.1 MB';
  return `${Math.max(0.1, bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileTypeLabel(file: File): string {
  return (file.name.split('.').pop() ?? 'PDF').toUpperCase().replace(/^JPEG$/, 'JPG');
}

export function fileNameFromKey(key: string): string {
  return key.split('/').pop() || key;
}

/** File storage exists only in Postgres mode; demo mode keeps metadata-only uploads. */
export function isFileUploadEnabled(): boolean {
  return getDataMode() === 'postgres';
}

export async function uploadFile(file: File, scope: FileScope = 'document'): Promise<UploadedFile> {
  const presign = await fetch('/api/files/presign', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: contentTypeOf(file),
      size: file.size,
      scope
    })
  });
  if (!presign.ok) throw new Error(await errorMessage(presign));

  const target = (await presign.json()) as {
    key: string;
    uploadUrl: string;
    method: string;
    headers: Record<string, string>;
  };

  const upload = await fetch(target.uploadUrl, {
    method: target.method,
    headers: target.headers,
    body: file,
    credentials: target.uploadUrl.startsWith('/') ? 'include' : 'omit'
  });
  if (!upload.ok) throw new Error('The file could not be stored. Please retry the upload.');

  return {
    key: target.key,
    fileName: file.name,
    size: formatFileSize(file.size),
    type: fileTypeLabel(file)
  };
}

export async function getDownloadUrl(key: string): Promise<string | null> {
  if (!isFileUploadEnabled()) return null;

  const response = await fetch('/api/files/signed-url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  });
  if (!response.ok) throw new Error(await errorMessage(response));

  const body = (await response.json()) as { url?: string };
  return body.url ?? null;
}

import type { DocumentExtraction } from '../types';
import { getDataMode } from './repositories';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export const MAX_VERIFICATION_FILE_MB = 8;
export const MAX_VERIFICATION_FILE_BYTES = MAX_VERIFICATION_FILE_MB * 1024 * 1024;

export interface VerificationAdvisory {
  text: string;
  provider: 'gemini';
}

export interface DocumentVerificationApiSuccess {
  ok: true;
  extraction: DocumentExtraction;
  advisory?: VerificationAdvisory;
  fileName: string;
  fileSize: number;
  fileHash: string;
}

export interface DocumentVerificationApiFailure {
  ok: false;
  code: string;
  message: string;
}

export type DocumentVerificationApiResult =
  | DocumentVerificationApiSuccess
  | DocumentVerificationApiFailure;

export function validateVerificationFile(file: File | null | undefined): string | null {
  if (!file) return 'Choose a PDF document to verify.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_VERIFICATION_FILE_BYTES) {
    return `The file is larger than ${MAX_VERIFICATION_FILE_MB} MB.`;
  }
  const isPdfName = file.name.toLowerCase().endsWith('.pdf');
  if (file.type !== 'application/pdf' && !isPdfName) {
    return 'Only PDF documents can be verified.';
  }
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function authHeaders(): Promise<Record<string, string>> {
  if (getDataMode() !== 'supabase' || !isSupabaseConfigured) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface RequestVerificationInput {
  file: File;
  applicationId: string;
  documentTypeCode: string;
  useAiSummary?: boolean;
}

export async function requestDocumentVerification({
  file,
  applicationId,
  documentTypeCode,
  useAiSummary = true
}: RequestVerificationInput): Promise<DocumentVerificationApiResult> {
  const fileError = validateVerificationFile(file);
  if (fileError) {
    return { ok: false, code: 'INVALID_FILE', message: fileError };
  }

  let fileBase64: string;
  try {
    fileBase64 = await readFileAsBase64(file);
  } catch {
    return { ok: false, code: 'READ_FAILED', message: 'The selected file could not be read.' };
  }

  let response: Response;
  try {
    response = await fetch('/api/documents/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeaders())
      },
      body: JSON.stringify({
        fileName: file.name,
        fileBase64,
        documentTypeCode,
        applicationId,
        useAiSummary
      })
    });
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'The verification service could not be reached. Run the app through the Vite dev server or the Node backend.'
    };
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.extraction) {
    return {
      ok: false,
      code: payload?.error || `HTTP_${response.status}`,
      message:
        payload?.message ||
        payload?.text ||
        'The document could not be verified. Please try again.'
    };
  }

  return {
    ok: true,
    extraction: payload.extraction as DocumentExtraction,
    advisory: payload.advisory?.text
      ? { text: String(payload.advisory.text), provider: 'gemini' }
      : undefined,
    fileName: typeof payload.fileName === 'string' ? payload.fileName : file.name,
    fileSize: typeof payload.fileSize === 'number' ? payload.fileSize : file.size,
    fileHash: typeof payload.fileHash === 'string' ? payload.fileHash : ''
  };
}

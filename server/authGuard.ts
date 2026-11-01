import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createRateLimiter,
  exceedsByteLimit,
  originAllowed
} from '../src/services/aiGuard.ts';

export { MAX_BODY_BYTES, resolveDemoRole, validateChatBody } from '../src/services/aiGuard.ts';
export type { ChatBody, ChatHistoryMessage } from '../src/services/aiGuard.ts';

export interface VerifiedCaller {
  userId: string;
  role: string;
  mode: 'supabase' | 'demo';
  region?: string;
  instituteId?: string;
}

export type CallerResult =
  | { ok: true; caller: VerifiedCaller }
  | { ok: false; status: number; error: string };

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function supabaseConfig(): SupabaseConfig {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  };
}

let authClient: SupabaseClient | null = null;
let authClientKey = '';
let profileClient: SupabaseClient | null = null;
let profileClientKey = '';

function clients(): { auth: SupabaseClient; profiles: SupabaseClient } {
  const { url, anonKey, serviceRoleKey } = supabaseConfig();

  if (!authClient || authClientKey !== `${url}|${anonKey}`) {
    authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    authClientKey = `${url}|${anonKey}`;
  }

  if (!serviceRoleKey) {
    return { auth: authClient, profiles: authClient };
  }

  if (!profileClient || profileClientKey !== `${url}|${serviceRoleKey}`) {
    profileClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    profileClientKey = `${url}|${serviceRoleKey}`;
  }

  return { auth: authClient, profiles: profileClient };
}

function bearerToken(req: any): string {
  const header = req.headers?.authorization ?? req.headers?.Authorization ?? '';
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
}

export function isProductionAuthEnabled(): boolean {
  const { url, anonKey } = supabaseConfig();
  return Boolean(url && anonKey);
}

/**
 * Resolves the caller from the Supabase access token and reads role and scope from
 * the database profile. The request body is never trusted for identity here.
 */
export async function verifyCaller(req: any): Promise<CallerResult> {
  if (!isProductionAuthEnabled()) {
    return { ok: true, caller: { userId: 'demo-guest', role: 'GUEST', mode: 'demo' } };
  }

  const token = bearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Sign in to use the assistant.' };
  }

  const { auth, profiles } = clients();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Your session is no longer valid. Sign in again.' };
  }

  const { data: profile, error: profileError } = await profiles
    .from('profiles')
    .select('role, region, institute_id, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, status: 403, error: 'No AICTE profile is provisioned for this account.' };
  }
  if (!profile.is_active) {
    return { ok: false, status: 403, error: 'This account has been deactivated.' };
  }

  return {
    ok: true,
    caller: {
      userId: data.user.id,
      role: profile.role,
      mode: 'supabase',
      region: profile.region ?? undefined,
      instituteId: profile.institute_id ?? undefined
    }
  };
}

const rateLimiter = createRateLimiter();

function callerKey(req: any, caller: VerifiedCaller): string {
  if (caller.mode === 'supabase') return `user:${caller.userId}`;
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
    req.socket?.remoteAddress ||
    'local';
  return `ip:${ip}`;
}

export function checkRateLimit(
  req: any,
  caller: VerifiedCaller
): { ok: true } | { ok: false; retryAfter: number } {
  return rateLimiter(callerKey(req, caller));
}

export function bodyTooLarge(req: any): boolean {
  return exceedsByteLimit(req.headers?.['content-length'] ?? req.headers?.['Content-Length']);
}

function allowedOrigins(): string[] {
  return (process.env.AI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string): boolean {
  return originAllowed(origin, allowedOrigins());
}

export function corsHeaders(req: any): Record<string, string> {
  const origin = req.headers?.origin ?? '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

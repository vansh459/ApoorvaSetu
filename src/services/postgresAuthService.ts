import type { User } from '../types';
import { authService } from './authService';

interface SessionPayload {
  user: User | null;
  expiresAt: string | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });
  } catch {
    throw new Error('Unable to reach the ApoorvaSetu server. Check that it is running.');
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let body: Record<string, unknown> = {};
  if (raw) {
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    const message =
      typeof body.text === 'string'
        ? body.text
        : typeof body.error === 'string'
          ? body.error
          : 'Authentication failed. Please try again.';
    throw new Error(message);
  }

  return body as T;
}

export const postgresAuthService = {
  async signIn(email: string, password: string, rememberMe = false): Promise<User> {
    const payload = await request<{ user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    authService.setRemoteUser(payload.user);
    return payload.user;
  },

  async getSessionUser(): Promise<User | null> {
    const payload = await request<SessionPayload>('/session');
    authService.setRemoteUser(payload.user);
    return payload.user;
  },

  async signOut(): Promise<void> {
    try {
      await request<void>('/logout', { method: 'POST' });
    } finally {
      authService.setRemoteUser(null);
    }
  }
};

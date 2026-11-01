import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDataMode } from './index';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getDataMode', () => {
  it('defaults to demo with an empty environment', () => {
    vi.stubEnv('VITE_DATA_MODE', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(getDataMode()).toBe('demo');
  });

  it('returns postgres when explicitly configured', () => {
    vi.stubEnv('VITE_DATA_MODE', 'postgres');
    expect(getDataMode()).toBe('postgres');
  });

  it('falls back to demo for a supabase mode without credentials', () => {
    vi.stubEnv('VITE_DATA_MODE', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(getDataMode()).toBe('demo');
  });
});

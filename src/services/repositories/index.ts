import type { DataMode } from '../../types';
import { isSupabaseConfigured } from '../supabaseClient';
import { localRepository } from './localRepository';
import { supabaseRepository } from './supabaseRepository';
import type { Repository } from './types';

export function getDataMode(): DataMode {
  const configured = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_DATA_MODE;
  if (configured === 'demo') return 'demo';
  if (configured === 'postgres') return 'postgres';
  if (configured === 'supabase') return isSupabaseConfigured ? 'supabase' : 'demo';
  return isSupabaseConfigured ? 'supabase' : 'demo';
}

export function getRepository(mode: DataMode = getDataMode()): Repository {
  return mode === 'supabase' ? supabaseRepository : localRepository;
}

export { localRepository, supabaseRepository };
export * from './localRepository';
export type { Repository, RepositorySnapshot } from './types';

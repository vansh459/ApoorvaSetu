import type { DataMode } from '../../types';
import { isSupabaseConfigured } from '../supabaseClient';
import { localRepository } from './localRepository';
import { postgresRepository } from './postgresRepository';
import { supabaseRepository } from './supabaseRepository';
import type { Repository } from './types';

export function getDataMode(): DataMode {
  const configured = import.meta.env.VITE_DATA_MODE;
  if (configured === 'demo') return 'demo';
  if (configured === 'postgres') return 'postgres';
  if (configured === 'supabase') return isSupabaseConfigured ? 'supabase' : 'demo';
  return isSupabaseConfigured ? 'supabase' : 'demo';
}

export function getRepository(mode: DataMode = getDataMode()): Repository {
  if (mode === 'postgres') return postgresRepository;
  if (mode === 'supabase') return supabaseRepository;
  return localRepository;
}

export { localRepository, postgresRepository, supabaseRepository };
export * from './localRepository';
export type { Repository, RepositorySnapshot } from './types';

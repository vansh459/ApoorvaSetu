import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { Permission, Region, User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS } from './rbacService';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  region: Region | null;
  institute_id: string | null;
  committee_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function toUser(profile: ProfileRow, lastLogin?: string): User {
  const permissions: Permission[] = ROLE_DEFAULT_PERMISSIONS[profile.role] ?? [];
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    roleTitle: ROLE_LABELS[profile.role],
    permissions: [...permissions],
    initials: initialsFor(profile.name),
    region: profile.region ?? undefined,
    instituteId: profile.institute_id ?? undefined,
    committeeName: profile.committee_name ?? undefined,
    phone: profile.phone ?? undefined,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    lastLogin
  };
}

async function loadProfile(authUser: SupabaseUser): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, region, institute_id, committee_name, phone, is_active, created_at')
    .eq('id', authUser.id)
    .maybeSingle<ProfileRow>();

  if (error) throw new Error('Unable to load your AICTE profile. Try signing in again.');
  if (!data) throw new Error('No AICTE profile is provisioned for this account. Contact the administrator.');
  if (!data.is_active) {
    await supabase.auth.signOut();
    throw new Error('This account has been deactivated. Contact the administrator.');
  }

  return toUser(data, authUser.last_sign_in_at ?? undefined);
}

async function sessionUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;
  return loadProfile(session.user);
}

export const supabaseAuthService = {
  isConfigured: isSupabaseConfigured,

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error || !data.session) {
      throw new Error('Invalid credentials. Use your official AICTE email and password.');
    }
    return loadProfile(data.session.user);
  },

  async getSessionUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return sessionUser(data.session);
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  },

  onAuthChange(handler: (user: User | null) => void): () => void {
    if (!isSupabaseConfigured) return () => undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        handler(null);
        return;
      }
      // The callback must stay synchronous; profile loading is deferred a tick.
      void loadProfile(session.user)
        .then(handler)
        .catch(() => handler(null));
    });
    return () => data.subscription.unsubscribe();
  }
};

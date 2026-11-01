import type {
  Application,
  AuditLog,
  ComplianceRecord,
  DocumentItem,
  EscalationItem,
  EVCVisit,
  Institute,
  NotificationItem,
  SystemAlert,
  SystemConfig,
  Undertaking
} from '../../types';
import type { Repository, RepositorySnapshot } from './types';

export const LEGACY_STORAGE_PREFIX = 'aicte_approval_system_data_v3';
export const STORAGE_PREFIX = 'aicte_approval_system_data_v4';
export const AUDIT_STORAGE_KEY = 'apoorvasetu_audit_v4';

export const LOCAL_KEYS = {
  user: `${STORAGE_PREFIX}_user`,
  applications: `${STORAGE_PREFIX}_apps`,
  institutes: `${STORAGE_PREFIX}_institutes`,
  evcVisits: `${STORAGE_PREFIX}_evc`,
  complianceRecords: `${STORAGE_PREFIX}_compliance`,
  documents: `${STORAGE_PREFIX}_docs`,
  notifications: `${STORAGE_PREFIX}_notifs`,
  undertakings: `${STORAGE_PREFIX}_undertakings`,
  alerts: `${STORAGE_PREFIX}_alerts`,
  escalations: `${STORAGE_PREFIX}_escalations`,
  auditLogs: AUDIT_STORAGE_KEY,
  config: 'apoorvaset_config_v1'
} as const;

const LEGACY_KEYS: Partial<Record<keyof typeof LOCAL_KEYS, string>> = {
  user: `${LEGACY_STORAGE_PREFIX}_user`,
  applications: `${LEGACY_STORAGE_PREFIX}_apps`,
  institutes: `${LEGACY_STORAGE_PREFIX}_institutes`,
  evcVisits: `${LEGACY_STORAGE_PREFIX}_evc`,
  complianceRecords: `${LEGACY_STORAGE_PREFIX}_compliance`,
  documents: `${LEGACY_STORAGE_PREFIX}_docs`,
  notifications: `${LEGACY_STORAGE_PREFIX}_notifs`
};

function hasStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function readLocal<T>(key: keyof typeof LOCAL_KEYS, fallback: T): T {
  if (!hasStorage()) return fallback;
  const current = window.localStorage.getItem(LOCAL_KEYS[key]);
  if (current) {
    try {
      return JSON.parse(current) as T;
    } catch {
      return fallback;
    }
  }

  const legacyKey = LEGACY_KEYS[key];
  if (legacyKey) {
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy) as T;
        window.localStorage.setItem(LOCAL_KEYS[key], legacy);
        return parsed;
      } catch {
        return fallback;
      }
    }
  }

  return fallback;
}

export function writeLocal<T>(key: keyof typeof LOCAL_KEYS, value: T): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(LOCAL_KEYS[key], JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to persist local data:', error);
  }
}

export function clearLocal(): void {
  if (!hasStorage()) return;
  Object.values(LOCAL_KEYS).forEach((key) => window.localStorage.removeItem(key));
  Object.values(LEGACY_KEYS).forEach((key) => {
    if (key) window.localStorage.removeItem(key);
  });
}

class LocalRepository implements Repository {
  readonly mode = 'demo' as const;
  readonly isRemote = false;

  async loadRemote(): Promise<RepositorySnapshot | null> {
    return null;
  }

  async upsertApplication(_app: Application): Promise<boolean> {
    return true;
  }

  async upsertEVCVisit(_visit: EVCVisit): Promise<boolean> {
    return true;
  }

  async upsertComplianceRecord(_record: ComplianceRecord): Promise<boolean> {
    return true;
  }

  async upsertDocument(_document: DocumentItem): Promise<boolean> {
    return true;
  }

  async upsertNotification(_notification: NotificationItem): Promise<boolean> {
    return true;
  }

  async upsertUndertaking(_undertaking: Undertaking): Promise<boolean> {
    return true;
  }

  async upsertAlert(_alert: SystemAlert): Promise<boolean> {
    return true;
  }

  async upsertEscalation(_escalation: EscalationItem): Promise<boolean> {
    return true;
  }

  async appendAudit(log: Omit<AuditLog, 'id'>): Promise<void> {
    const existing = readLocal<AuditLog[]>('auditLogs', []);
    const entry: AuditLog = {
      ...log,
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };
    writeLocal('auditLogs', [entry, ...existing].slice(0, 2000));
  }

  async saveConfig(config: SystemConfig): Promise<boolean> {
    if (!hasStorage()) return false;
    try {
      window.localStorage.setItem(LOCAL_KEYS.config, JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  }

  subscribe(_table: string, _callback: () => void): () => void {
    return () => undefined;
  }
}

export const localRepository = new LocalRepository();

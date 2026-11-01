import type {
  Application,
  AuditLog,
  ComplianceRecord,
  DocumentItem,
  EscalationItem,
  EVCVisit,
  NotificationItem,
  SystemAlert,
  SystemConfig,
  Undertaking
} from '../../types';
import type { TransitionDenialCode, TransitionRequest } from '../../workflow/types';
import type {
  Repository,
  RepositorySnapshot,
  TransitionResponse,
  VerifiableEntity,
  VerifyResponse
} from './types';

type EntityKey =
  | 'applications'
  | 'evcVisits'
  | 'complianceRecords'
  | 'documents'
  | 'notifications'
  | 'undertakings'
  | 'alerts'
  | 'escalations';

const ENDPOINTS: Record<EntityKey, string> = {
  applications: '/applications',
  evcVisits: '/evc-visits',
  complianceRecords: '/compliance',
  documents: '/documents',
  notifications: '/notifications',
  undertakings: '/undertakings',
  alerts: '/alerts',
  escalations: '/escalations'
};

const VERIFY_ENDPOINTS: Record<VerifiableEntity, string> = {
  undertaking: '/undertakings',
  document: '/documents',
  compliance: '/compliance'
};

const SNAPSHOT_KEYS: Record<EntityKey, keyof RepositorySnapshot> = {
  applications: 'applications',
  evcVisits: 'evcVisits',
  complianceRecords: 'complianceRecords',
  documents: 'documents',
  notifications: 'notifications',
  undertakings: 'undertakings',
  alerts: 'alerts',
  escalations: 'escalations'
};

interface ErrorBody {
  error?: string;
  text?: string;
}

class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function readError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Non-JSON error bodies carry no detail worth surfacing.
  }
  return new ApiError(
    response.status,
    body.error ?? `HTTP_${response.status}`,
    body.text ?? `Request failed with status ${response.status}.`
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

class PostgresRepository implements Repository {
  readonly mode = 'postgres' as const;
  readonly isRemote = true;

  private knownIds: Record<EntityKey, Set<string>> = {
    applications: new Set(),
    evcVisits: new Set(),
    complianceRecords: new Set(),
    documents: new Set(),
    notifications: new Set(),
    undertakings: new Set(),
    alerts: new Set(),
    escalations: new Set()
  };

  private writeQueue: Promise<unknown> = Promise.resolve();
  private errorHandlers = new Set<(message: string) => void>();
  private eventSource: EventSource | null = null;
  private listeners = new Set<() => void>();

  async loadRemote(): Promise<RepositorySnapshot | null> {
    try {
      const snapshot = await request<RepositorySnapshot>('/api/snapshot');
      this.track(snapshot);
      return snapshot;
    } catch (error) {
      this.report(error);
      return null;
    }
  }

  private track(snapshot: RepositorySnapshot): void {
    for (const key of Object.keys(SNAPSHOT_KEYS) as EntityKey[]) {
      const rows = snapshot[SNAPSHOT_KEYS[key]];
      if (!Array.isArray(rows)) continue;
      this.knownIds[key] = new Set((rows as { id: string }[]).map((row) => row.id));
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private report(error: unknown): void {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Could not reach the server. Your change was not saved.';
    for (const handler of this.errorHandlers) handler(message);
  }

  private async persist<T extends { id: string }>(key: EntityKey, entity: T): Promise<boolean> {
    const endpoint = ENDPOINTS[key];
    const known = () => this.knownIds[key].has(entity.id);
    const body = JSON.stringify(entity);

    const send = async (method: 'POST' | 'PUT') => {
      const url =
        method === 'POST'
          ? `/api${endpoint}`
          : `/api${endpoint}/${encodeURIComponent(entity.id)}`;
      return request<unknown>(url, { method, body });
    };

    return this.enqueue(async () => {
      try {
        try {
          await send(known() ? 'PUT' : 'POST');
        } catch (error) {
          if (error instanceof ApiError && error.code === 'ALREADY_EXISTS') {
            await send('PUT');
          } else if (error instanceof ApiError && error.status < 500) {
            throw error;
          } else {
            await send(known() ? 'PUT' : 'POST');
          }
        }
        this.knownIds[key].add(entity.id);
        return true;
      } catch (error) {
        this.report(error);
        return false;
      }
    });
  }

  upsertApplication(app: Application): Promise<boolean> {
    return this.persist('applications', app);
  }

  upsertEVCVisit(visit: EVCVisit): Promise<boolean> {
    return this.persist('evcVisits', visit);
  }

  upsertComplianceRecord(record: ComplianceRecord): Promise<boolean> {
    return this.persist('complianceRecords', record);
  }

  upsertDocument(document: DocumentItem): Promise<boolean> {
    return this.persist('documents', document);
  }

  upsertNotification(notification: NotificationItem): Promise<boolean> {
    return this.persist('notifications', notification);
  }

  upsertUndertaking(undertaking: Undertaking): Promise<boolean> {
    return this.persist('undertakings', undertaking);
  }

  upsertAlert(alert: SystemAlert): Promise<boolean> {
    return this.persist('alerts', alert);
  }

  upsertEscalation(escalation: EscalationItem): Promise<boolean> {
    return this.persist('escalations', escalation);
  }

  async appendAudit(log: Omit<AuditLog, 'id'>): Promise<void> {
    try {
      await request<{ audit: AuditLog }>('/api/audit', {
        method: 'POST',
        body: JSON.stringify({
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: log.details,
          previousState: log.previousState,
          newState: log.newState,
          eventType: log.eventType,
          correlationId: log.correlationId,
          source: log.source
        })
      });
    } catch (error) {
      this.report(error);
    }
  }

  async saveConfig(config: SystemConfig): Promise<boolean> {
    try {
      await request('/api/config', { method: 'PUT', body: JSON.stringify(config) });
      return true;
    } catch (error) {
      this.report(error);
      return false;
    }
  }

  subscribe(_table: string, callback: () => void): () => void {
    this.listeners.add(callback);
    this.ensureEventSource();
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.eventSource?.close();
        this.eventSource = null;
      }
    };
  }

  private ensureEventSource(): void {
    if (this.eventSource || typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/events', { withCredentials: true });
    source.addEventListener('change', () => {
      for (const listener of this.listeners) listener();
    });
    this.eventSource = source;
  }

  async transitionApplication(
    appId: string,
    requestBody: Omit<TransitionRequest, 'actor'>
  ): Promise<TransitionResponse> {
    try {
      return await request<TransitionResponse>(
        `/api/applications/${encodeURIComponent(appId)}/transitions`,
        { method: 'POST', body: JSON.stringify(requestBody) }
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          ok: false,
          code: error.code as TransitionDenialCode,
          message: error.message
        };
      }
      return { ok: false, message: 'Could not reach the server.' };
    }
  }

  async verifyEntity(
    entity: VerifiableEntity,
    id: string,
    payload: Record<string, unknown> = {}
  ): Promise<VerifyResponse> {
    try {
      return await request<VerifyResponse>(
        `/api${VERIFY_ENDPOINTS[entity]}/${encodeURIComponent(id)}/verify`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
    } catch (error) {
      if (error instanceof ApiError) return { ok: false, message: error.message };
      return { ok: false, message: 'Could not reach the server.' };
    }
  }

  async resetRemote(): Promise<boolean> {
    try {
      await request('/api/admin/reset', { method: 'POST' });
      this.knownIds = {
        applications: new Set(),
        evcVisits: new Set(),
        complianceRecords: new Set(),
        documents: new Set(),
        notifications: new Set(),
        undertakings: new Set(),
        alerts: new Set(),
        escalations: new Set()
      };
      return true;
    } catch (error) {
      this.report(error);
      return false;
    }
  }

  onWriteError(handler: (message: string) => void): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }
}

export const postgresRepository = new PostgresRepository();

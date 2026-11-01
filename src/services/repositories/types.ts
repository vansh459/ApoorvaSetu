import type {
  Application,
  AuditLog,
  ComplianceRecord,
  DataMode,
  DocumentItem,
  EscalationItem,
  EVCVisit,
  Institute,
  NotificationItem,
  Permission,
  SystemAlert,
  SystemConfig,
  Undertaking,
  User,
  UserRole
} from '../../types';
import type {
  DomainEvent,
  TransitionDenialCode,
  TransitionRequest
} from '../../workflow/types';

export interface RepositorySnapshot {
  applications?: Application[];
  institutes?: Institute[];
  evcVisits?: EVCVisit[];
  complianceRecords?: ComplianceRecord[];
  documents?: DocumentItem[];
  notifications?: NotificationItem[];
  undertakings?: Undertaking[];
  alerts?: SystemAlert[];
  escalations?: EscalationItem[];
  auditLogs?: AuditLog[];
  config?: SystemConfig | null;
  users?: User[];
  rolePermissions?: { role: UserRole; permissions: Permission[] }[];
}

export interface TransitionResponse {
  ok: boolean;
  code?: TransitionDenialCode;
  message?: string;
  application?: Application;
  undertakings?: Undertaking[];
  audits?: AuditLog[];
  events?: DomainEvent[];
}

export type VerifiableEntity = 'undertaking' | 'document' | 'compliance';

export interface VerifyResponse {
  ok: boolean;
  message?: string;
  entity?: Undertaking | DocumentItem | ComplianceRecord;
  audit?: AuditLog;
}

export interface Repository {
  readonly mode: DataMode;
  readonly isRemote: boolean;

  loadRemote(): Promise<RepositorySnapshot | null>;

  upsertApplication(app: Application): Promise<boolean>;
  upsertEVCVisit(visit: EVCVisit): Promise<boolean>;
  upsertComplianceRecord(record: ComplianceRecord): Promise<boolean>;
  upsertDocument(document: DocumentItem): Promise<boolean>;
  upsertNotification(notification: NotificationItem): Promise<boolean>;
  upsertUndertaking(undertaking: Undertaking): Promise<boolean>;
  upsertAlert(alert: SystemAlert): Promise<boolean>;
  upsertEscalation(escalation: EscalationItem): Promise<boolean>;
  appendAudit(log: Omit<AuditLog, 'id'>): Promise<void>;
  saveConfig(config: SystemConfig): Promise<boolean>;

  subscribe(table: string, callback: () => void): () => void;

  /** Remote-only: regulated transitions run on the server with the session actor. */
  transitionApplication?(
    appId: string,
    request: Omit<TransitionRequest, 'actor'>
  ): Promise<TransitionResponse>;

  /** Remote-only: verification authority is stamped server-side from the session. */
  verifyEntity?(
    entity: VerifiableEntity,
    id: string,
    payload?: Record<string, unknown>
  ): Promise<VerifyResponse>;

  /** Remote-only: administrative reset of the seeded dataset. */
  resetRemote?(): Promise<boolean>;

  /** Remote-only: surface write failures to the UI without throwing. */
  onWriteError?(handler: (message: string) => void): () => void;
}

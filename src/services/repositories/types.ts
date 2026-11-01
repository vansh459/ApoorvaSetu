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
  SystemAlert,
  SystemConfig,
  Undertaking
} from '../../types';

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
}

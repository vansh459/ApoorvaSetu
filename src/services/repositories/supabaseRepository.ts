import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type {
  Application,
  AuditLog,
  ComplianceRecord,
  DocumentItem,
  DocumentVerificationReport,
  EscalationItem,
  EVCVisit,
  Institute,
  NotificationItem,
  SystemAlert,
  SystemConfig,
  Undertaking
} from '../../types';
import type { Repository, RepositorySnapshot } from './types';

class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;
  readonly isRemote = true;

  async loadRemote(): Promise<RepositorySnapshot | null> {
    if (!isSupabaseConfigured) return null;

    const [applications, institutes, evcVisits, complianceRecords, documents, documentVerifications, notifications, undertakings, alerts, escalations, config] =
      await Promise.all([
        this.fetchApplications(),
        this.fetchInstitutes(),
        this.fetchEVCVisits(),
        this.fetchComplianceRecords(),
        this.fetchDocuments(),
        this.fetchDocumentVerifications(),
        this.fetchNotifications(),
        this.fetchUndertakings(),
        this.fetchAlerts(),
        this.fetchEscalations(),
        this.fetchConfig()
      ]);

    return {
      applications: applications ?? undefined,
      institutes: institutes ?? undefined,
      evcVisits: evcVisits ?? undefined,
      complianceRecords: complianceRecords ?? undefined,
      documents: documents ?? undefined,
      documentVerifications: documentVerifications ?? undefined,
      notifications: notifications ?? undefined,
      undertakings: undertakings ?? undefined,
      alerts: alerts ?? undefined,
      escalations: escalations ?? undefined,
      config
    };
  }

  private async fetchApplications(): Promise<Application[] | null> {
    try {
      const { data, error } = await supabase.from('applications').select('*');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        instituteId: row.institute_id,
        instituteName: row.institute_name,
        type: row.type,
        region: row.region,
        state: row.state,
        stage: row.stage,
        status: row.status,
        lastUpdated: row.last_updated,
        appliedDate: row.applied_date,
        category: row.category,
        intakeProposed: row.intake_proposed,
        programs: row.programs || [],
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        timeline: row.timeline || [],
        documents: row.documents || [],
        remarks: row.remarks,
        routeId: row.route_id ?? undefined,
        stageEnteredAt: row.stage_entered_at ?? undefined,
        stageDueAt: row.stage_due_at ?? undefined,
        assignedOfficerId: row.assigned_officer_id ?? undefined,
        deficiencies: row.deficiencies ?? [],
        returns: row.returns ?? [],
        decision: row.decision ?? undefined,
        evcVisitId: row.evc_visit_id ?? undefined,
        version: row.version ?? 1
      })) as Application[];
    } catch {
      return null;
    }
  }

  async upsertApplication(app: Application): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('applications').upsert({
        id: app.id,
        institute_id: app.instituteId,
        institute_name: app.instituteName,
        type: app.type,
        region: app.region,
        state: app.state,
        stage: app.stage,
        status: app.status,
        last_updated: app.lastUpdated,
        applied_date: app.appliedDate,
        category: app.category,
        intake_proposed: app.intakeProposed,
        programs: app.programs,
        contact_email: app.contactEmail,
        contact_phone: app.contactPhone,
        timeline: app.timeline,
        documents: app.documents,
        remarks: app.remarks,
        route_id: app.routeId,
        stage_entered_at: app.stageEnteredAt,
        stage_due_at: app.stageDueAt,
        assigned_officer_id: app.assignedOfficerId,
        deficiencies: app.deficiencies ?? [],
        returns: app.returns ?? [],
        decision: app.decision ?? null,
        evc_visit_id: app.evcVisitId,
        version: app.version ?? 1
      });
      if (error) {
        console.warn('Supabase upsertApplication error:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async fetchInstitutes(): Promise<Institute[] | null> {
    try {
      const { data, error } = await supabase.from('institutes').select('*').order('name');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        region: row.region,
        state: row.state,
        city: row.city,
        category: row.category,
        establishedYear: row.established_year,
        principalName: row.principal_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        status: row.status,
        approvedSeats: row.approved_seats,
        accreditedPrograms: row.accredited_programs,
        complianceScore: Number(row.compliance_score || 0),
        activeApplicationsCount: row.active_applications_count
      })) as Institute[];
    } catch {
      return null;
    }
  }

  private async fetchEVCVisits(): Promise<EVCVisit[] | null> {
    try {
      const { data, error } = await supabase.from('evc_visits').select('*').order('date');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        applicationId: row.application_id,
        instituteId: row.institute_id,
        instituteName: row.institute_name,
        stateRegion: row.state_region,
        region: row.region,
        date: row.date,
        displayDate: row.display_date,
        status: row.status,
        assignedCommittee: row.assigned_committee,
        committeeMembers: row.committee_members || [],
        mode: row.mode,
        reportSubmitted: row.report_submitted,
        scheduledAt: row.scheduled_at ?? undefined,
        reportDueAt: row.report_due_at ?? undefined,
        reportSubmittedAt: row.report_submitted_at ?? undefined,
        escalationLevel: row.escalation_level ?? 0
      })) as EVCVisit[];
    } catch {
      return null;
    }
  }

  async upsertEVCVisit(visit: EVCVisit): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('evc_visits').upsert({
        id: visit.id,
        application_id: visit.applicationId,
        institute_id: visit.instituteId,
        institute_name: visit.instituteName,
        state_region: visit.stateRegion,
        region: visit.region,
        date: visit.date,
        display_date: visit.displayDate,
        status: visit.status,
        assigned_committee: visit.assignedCommittee,
        committee_members: visit.committeeMembers,
        mode: visit.mode,
        report_submitted: visit.reportSubmitted,
        scheduled_at: visit.scheduledAt,
        report_due_at: visit.reportDueAt,
        report_submitted_at: visit.reportSubmittedAt,
        escalation_level: visit.escalationLevel ?? 0
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchComplianceRecords(): Promise<ComplianceRecord[] | null> {
    try {
      const { data, error } = await supabase.from('compliance_records').select('*').order('due_date');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        instituteName: row.institute_name,
        instituteId: row.institute_id,
        region: row.region,
        status: row.status,
        dueDate: row.due_date,
        submissionDate: row.submission_date,
        documentRef: row.document_ref,
        urgency: row.urgency,
        undertakingId: row.undertaking_id ?? undefined,
        verifiedAt: row.verified_at ?? undefined,
        verifiedBy: row.verified_by ?? undefined,
        escalationLevel: row.escalation_level ?? 0
      })) as ComplianceRecord[];
    } catch {
      return null;
    }
  }

  async upsertComplianceRecord(record: ComplianceRecord): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('compliance_records').upsert({
        id: record.id,
        title: record.title,
        category: record.category,
        institute_name: record.instituteName,
        institute_id: record.instituteId,
        region: record.region,
        status: record.status,
        due_date: record.dueDate,
        submission_date: record.submissionDate,
        document_ref: record.documentRef,
        urgency: record.urgency,
        undertaking_id: record.undertakingId,
        verified_at: record.verifiedAt,
        verified_by: record.verifiedBy
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchDocuments(): Promise<DocumentItem[] | null> {
    try {
      const { data, error } = await supabase.from('documents').select('*');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        instituteName: row.institute_name,
        instituteId: row.institute_id,
        region: row.region,
        uploadDate: row.upload_date,
        expiryDate: row.expiry_date,
        status: row.status,
        fileSize: row.file_size,
        fileType: row.file_type,
        documentTypeCode: row.document_type_code ?? undefined,
        renewalOfId: row.renewal_of_id ?? undefined,
        renewalStatus: row.renewal_status ?? undefined,
        renewalNote: row.renewal_note ?? undefined,
        verifiedBy: row.verified_by ?? undefined,
        storagePath: row.storage_path ?? undefined
      })) as DocumentItem[];
    } catch {
      return null;
    }
  }

  async upsertDocument(document: DocumentItem): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('documents').upsert({
        id: document.id,
        title: document.title,
        category: document.category,
        institute_name: document.instituteName,
        institute_id: document.instituteId,
        region: document.region,
        upload_date: document.uploadDate,
        expiry_date: document.expiryDate,
        status: document.status,
        file_size: document.fileSize,
        file_type: document.fileType,
        document_type_code: document.documentTypeCode,
        renewal_of_id: document.renewalOfId,
        renewal_status: document.renewalStatus,
        renewal_note: document.renewalNote,
        verified_by: document.verifiedBy,
        storage_path: document.storagePath
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchDocumentVerifications(): Promise<DocumentVerificationReport[] | null> {
    try {
      const { data, error } = await supabase
        .from('document_verifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return null;
      return data.map((row: any) => row.report as DocumentVerificationReport).filter(Boolean);
    } catch {
      return null;
    }
  }

  async upsertDocumentVerification(report: DocumentVerificationReport): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('document_verifications').upsert({
        id: report.id,
        application_id: report.applicationId,
        document_id: report.documentId ?? null,
        institute_id: report.instituteId,
        institute_name: report.instituteName,
        region: report.region,
        document_type_code: report.documentTypeCode,
        file_name: report.fileName,
        file_type: report.fileType,
        file_size: report.fileSize,
        file_hash: report.fileHash,
        storage_path: report.storagePath ?? null,
        extraction_method: report.extraction.method,
        extracted_fields: report.extraction.fields,
        checklist: report.checklist,
        issues: report.issues,
        ai_summary: report.aiSummary ?? null,
        disclaimer: report.disclaimer,
        status: report.status,
        decision: report.decision ?? null,
        report,
        created_by: report.createdBy,
        created_by_user_id: report.createdByUserId,
        created_at: report.createdAt,
        reviewed_by: report.decision?.byUserId ?? null,
        reviewed_by_name: report.decision?.by ?? null,
        reviewed_at: report.decision?.at ?? null
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchNotifications(): Promise<NotificationItem[] | null> {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        timestamp: row.timestamp,
        read: row.read,
        priority: row.priority,
        link: row.link,
        targetRole: row.target_role,
        targetRegion: row.target_region,
        targetInstituteId: row.target_institute_id,
        dedupeKey: row.dedupe_key ?? undefined,
        eventType: row.event_type ?? undefined,
        targetUserId: row.target_user_id ?? undefined
      })) as NotificationItem[];
    } catch {
      return null;
    }
  }

  async upsertNotification(notification: NotificationItem): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('notifications').upsert({
        id: notification.id,
        title: notification.title,
        description: notification.description,
        category: notification.category,
        timestamp: notification.timestamp,
        read: notification.read,
        priority: notification.priority,
        link: notification.link,
        target_role: notification.targetRole,
        target_region: notification.targetRegion,
        target_institute_id: notification.targetInstituteId,
        dedupe_key: notification.dedupeKey,
        event_type: notification.eventType,
        target_user_id: notification.targetUserId
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchUndertakings(): Promise<Undertaking[] | null> {
    try {
      const { data, error } = await supabase.from('undertakings').select('*');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        applicationId: row.application_id,
        instituteId: row.institute_id,
        instituteName: row.institute_name,
        region: row.region,
        conditionCode: row.condition_code,
        title: row.title,
        dueDate: row.due_date,
        evidenceDocumentIds: row.evidence_document_ids || [],
        submittedAt: row.submitted_at ?? undefined,
        submittedBy: row.submitted_by ?? undefined,
        verifiedAt: row.verified_at ?? undefined,
        verifiedBy: row.verified_by ?? undefined,
        rejectionReason: row.rejection_reason ?? undefined,
        status: row.status,
        escalationLevel: row.escalation_level ?? 0
      })) as Undertaking[];
    } catch {
      return null;
    }
  }

  async upsertUndertaking(undertaking: Undertaking): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('undertakings').upsert({
        id: undertaking.id,
        application_id: undertaking.applicationId,
        institute_id: undertaking.instituteId,
        institute_name: undertaking.instituteName,
        region: undertaking.region,
        condition_code: undertaking.conditionCode,
        title: undertaking.title,
        due_date: undertaking.dueDate,
        evidence_document_ids: undertaking.evidenceDocumentIds,
        submitted_at: undertaking.submittedAt,
        submitted_by: undertaking.submittedBy,
        verified_at: undertaking.verifiedAt,
        verified_by: undertaking.verifiedBy,
        rejection_reason: undertaking.rejectionReason,
        status: undertaking.status,
        escalation_level: undertaking.escalationLevel
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchAlerts(): Promise<SystemAlert[] | null> {
    try {
      const { data, error } = await supabase.from('alerts').select('*');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        rule: row.rule,
        entityType: row.entity_type,
        entityId: row.entity_id,
        tier: row.tier,
        severity: row.severity,
        dedupeKey: row.dedupe_key,
        createdAt: row.created_at,
        status: row.status,
        title: row.title,
        description: row.description,
        link: row.link,
        region: row.region,
        instituteId: row.institute_id,
        targetRoles: row.target_roles || []
      })) as SystemAlert[];
    } catch {
      return null;
    }
  }

  async upsertAlert(alert: SystemAlert): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('alerts').upsert({
        id: alert.id,
        rule: alert.rule,
        entity_type: alert.entityType,
        entity_id: alert.entityId,
        tier: alert.tier,
        severity: alert.severity,
        dedupe_key: alert.dedupeKey,
        created_at: alert.createdAt,
        status: alert.status,
        title: alert.title,
        description: alert.description,
        link: alert.link,
        region: alert.region,
        institute_id: alert.instituteId,
        target_roles: alert.targetRoles ?? []
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async fetchEscalations(): Promise<EscalationItem[] | null> {
    try {
      const { data, error } = await supabase.from('escalations').select('*');
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        applicationId: row.application_id,
        instituteName: row.institute_name,
        region: row.region,
        raisedBy: row.raised_by,
        raisedDate: row.raised_date,
        urgency: row.urgency,
        reason: row.reason,
        status: row.status,
        level: row.level ?? 1,
        slaBreachDays: row.sla_breach_days ?? 0,
        dedupeKey: row.dedupe_key,
        entityType: row.entity_type,
        entityId: row.entity_id
      })) as EscalationItem[];
    } catch {
      return null;
    }
  }

  async upsertEscalation(escalation: EscalationItem): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('escalations').upsert({
        id: escalation.id,
        application_id: escalation.applicationId,
        institute_name: escalation.instituteName,
        region: escalation.region,
        raised_by: escalation.raisedBy,
        raised_date: escalation.raisedDate,
        urgency: escalation.urgency,
        reason: escalation.reason,
        status: escalation.status,
        level: escalation.level ?? 1,
        sla_breach_days: escalation.slaBreachDays ?? 0,
        dedupe_key: escalation.dedupeKey,
        entity_type: escalation.entityType,
        entity_id: escalation.entityId
      });
      return !error;
    } catch {
      return false;
    }
  }

  async appendAudit(log: Omit<AuditLog, 'id'>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const base = {
      user_id: log.userId,
      user_name: log.userName,
      user_role: log.userRole,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityId,
      details: log.details,
      previous_state: log.previousState,
      new_state: log.newState,
      ip_address: log.ipAddress
    };
    const extended = {
      ...base,
      event_type: log.eventType,
      correlation_id: log.correlationId,
      source: log.source
    };
    try {
      const { error } = await supabase.from('audit_logs').insert(extended);
      if (error) {
        await supabase.from('audit_logs').insert(base);
      }
    } catch {
      // Audit is best-effort in remote mode; local mode retains the full trail.
    }
  }

  private async fetchConfig(): Promise<SystemConfig | null> {
    try {
      const { data, error } = await supabase.from('system_config').select('*').eq('id', 'default').maybeSingle();
      if (error || !data) return null;
      return {
        maintenanceMode: data.maintenance_mode,
        academicYear: data.academic_year,
        approvalCycleEndDate: data.approval_cycle_end_date,
        evcMinMembers: data.evc_min_members,
        autoEscalationDays: data.auto_escalation_days,
        notificationEmailAlerts: data.notification_email_alerts,
        requireTwoFactorForAdmin: data.require_two_factor_for_admin,
        maxUploadSizeMB: data.max_upload_size_mb
      };
    } catch {
      return null;
    }
  }

  async saveConfig(config: SystemConfig): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('system_config').upsert({
        id: 'default',
        maintenance_mode: config.maintenanceMode,
        academic_year: config.academicYear,
        approval_cycle_end_date: config.approvalCycleEndDate,
        evc_min_members: config.evcMinMembers,
        auto_escalation_days: config.autoEscalationDays,
        notification_email_alerts: config.notificationEmailAlerts,
        require_two_factor_for_admin: config.requireTwoFactorForAdmin,
        max_upload_size_mb: config.maxUploadSizeMB,
        updated_at: new Date().toISOString()
      });
      return !error;
    } catch {
      return false;
    }
  }

  subscribe(table: string, callback: () => void): () => void {
    if (!isSupabaseConfigured) return () => undefined;
    const channel = supabase
      .channel(`apoorvasetu-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const supabaseRepository = new SupabaseRepository();

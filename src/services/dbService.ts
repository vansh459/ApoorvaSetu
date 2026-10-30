import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  Application,
  Institute,
  EVCVisit,
  ComplianceRecord,
  DocumentItem,
  NotificationItem,
  AuditLog
} from '../types';

export const dbService = {
  // Check if Supabase PostgreSQL is connected
  isConnected(): boolean {
    return isSupabaseConfigured;
  },

  // Applications
  async fetchApplications(): Promise<Application[] | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchApplications error:', error.message);
        return null;
      }

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
        remarks: row.remarks
      }));
    } catch (err) {
      console.warn('Failed to query Supabase applications:', err);
      return null;
    }
  },

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
        remarks: app.remarks
      });
      if (error) {
        console.error('Supabase upsertApplication error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to upsert application:', err);
      return false;
    }
  },

  // Institutes
  async fetchInstitutes(): Promise<Institute[] | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('institutes')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Supabase fetchInstitutes error:', error.message);
        return null;
      }

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
      }));
    } catch (err) {
      console.warn('Failed to query Supabase institutes:', err);
      return null;
    }
  },

  // EVC Visits
  async fetchEVCVisits(): Promise<EVCVisit[] | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('evc_visits')
        .select('*')
        .order('date', { ascending: true });

      if (error) return null;

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
        reportSubmitted: row.report_submitted
      }));
    } catch {
      return null;
    }
  },

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
        report_submitted: visit.reportSubmitted
      });
      return !error;
    } catch {
      return false;
    }
  },

  // Compliance Records
  async fetchComplianceRecords(): Promise<ComplianceRecord[] | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('compliance_records')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) return null;

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
        urgency: row.urgency
      }));
    } catch {
      return null;
    }
  },

  async upsertComplianceRecord(rec: ComplianceRecord): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('compliance_records').upsert({
        id: rec.id,
        title: rec.title,
        category: rec.category,
        institute_name: rec.instituteName,
        institute_id: rec.instituteId,
        region: rec.region,
        status: rec.status,
        due_date: rec.dueDate,
        submission_date: rec.submissionDate,
        document_ref: rec.documentRef,
        urgency: rec.urgency
      });
      return !error;
    } catch {
      return false;
    }
  },

  // Audit Logs
  async insertAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('audit_logs').insert({
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
      });
    } catch (err) {
      console.warn('Failed to insert audit log to Supabase:', err);
    }
  }
};


import { createClient } from '@supabase/supabase-js';
import { sweepDeadlines } from '../../src/workflow/alerts.ts';
import { resolveWorkflowConfig } from '../../src/workflow/config.ts';
import type { Application, DocumentItem, EscalationItem, EVCVisit, SystemAlert, Undertaking } from '../../src/types/index.ts';

function authorized(req: any): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers?.authorization ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  return bearer === secret || req.headers?.['x-cron-secret'] === secret;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  if (!authorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.status(503).json({ error: 'Supabase service credentials are not configured.' });
    return;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const [applications, visits, undertakings, documents, alerts, escalations, configRow] = await Promise.all([
      supabase.from('applications').select('*'),
      supabase.from('evc_visits').select('*'),
      supabase.from('undertakings').select('*'),
      supabase.from('documents').select('*'),
      supabase.from('alerts').select('*'),
      supabase.from('escalations').select('*'),
      supabase.from('system_config').select('*').limit(1).maybeSingle()
    ]);

    if (applications.error) throw applications.error;

    const result = sweepDeadlines({
      applications: (applications.data ?? []).map(mapApplication),
      evcVisits: (visits.data ?? []).map(mapVisit),
      undertakings: (undertakings.data ?? []).map(mapUndertaking),
      documents: (documents.data ?? []).map(mapDocument),
      alerts: (alerts.data ?? []).map(mapAlert),
      escalations: (escalations.data ?? []).map(mapEscalation),
      config: resolveWorkflowConfig(configRow.data ? mapConfig(configRow.data) : null)
    });

    if (result.createdAlerts.length) {
      const { error } = await supabase
        .from('alerts')
        .upsert(result.createdAlerts.map(toAlertRow), { onConflict: 'dedupe_key', ignoreDuplicates: true });
      if (error) throw error;
    }

    if (result.resolvedAlerts.length) {
      const { error } = await supabase
        .from('alerts')
        .upsert(result.resolvedAlerts.map(toAlertRow), { onConflict: 'id' });
      if (error) throw error;
    }

    for (const escalation of [...result.createdEscalations, ...result.resolvedEscalations]) {
      const { error } = await supabase.from('escalations').upsert(toEscalationRow(escalation), { onConflict: 'id' });
      if (error) throw error;
    }

    const tierChanges = result.applications.filter(
      (app, index) => app.slaTier !== (applications.data?.[index]?.sla_tier ?? 'On Track')
    );
    for (const app of tierChanges) {
      const { error } = await supabase.from('applications').update({ sla_tier: app.slaTier }).eq('id', app.id);
      if (error) throw error;
    }

    res.status(200).json({
      ok: true,
      alertsCreated: result.createdAlerts.length,
      alertsResolved: result.resolvedAlerts.length,
      escalationsCreated: result.createdEscalations.length,
      escalationsResolved: result.resolvedEscalations.length,
      slaTierUpdates: tierChanges.length,
      at: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? 'Sweep failed.' });
  }
}

function mapApplication(row: any): Application {
  return {
    id: row.id,
    instituteId: row.institute_id,
    instituteName: row.institute_name,
    type: row.type,
    region: row.region,
    state: row.state ?? '',
    stage: row.stage,
    status: row.status,
    lastUpdated: row.last_updated ?? '',
    appliedDate: row.applied_date ?? '',
    category: row.category ?? '',
    intakeProposed: row.intake_proposed ?? 0,
    programs: row.programs ?? [],
    contactEmail: row.contact_email ?? '',
    contactPhone: row.contact_phone ?? '',
    documents: row.documents ?? [],
    timeline: row.timeline ?? [],
    stageEnteredAt: row.stage_entered_at ?? undefined,
    stageDueAt: row.stage_due_at ?? undefined,
    slaTier: row.sla_tier ?? undefined
  };
}

function mapVisit(row: any): EVCVisit {
  return {
    id: row.id,
    applicationId: row.application_id ?? undefined,
    instituteId: row.institute_id,
    instituteName: row.institute_name,
    stateRegion: row.state_region ?? '',
    region: row.region,
    date: row.date,
    displayDate: row.display_date ?? { day: '', month: '' },
    status: row.status,
    assignedCommittee: row.assigned_committee ?? '',
    committeeMembers: row.committee_members ?? [],
    mode: row.mode ?? 'Physical',
    reportSubmitted: row.report_submitted ?? false,
    scheduledAt: row.scheduled_at ?? undefined,
    reportDueAt: row.report_due_at ?? undefined,
    reportSubmittedAt: row.report_submitted_at ?? undefined
  };
}

function mapUndertaking(row: any): Undertaking {
  return {
    id: row.id,
    applicationId: row.application_id,
    instituteId: row.institute_id,
    instituteName: row.institute_name,
    region: row.region,
    conditionCode: row.condition_code,
    title: row.title,
    dueDate: row.due_date,
    evidenceDocumentIds: row.evidence_document_ids ?? [],
    submittedAt: row.submitted_at ?? undefined,
    submittedBy: row.submitted_by ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    verifiedBy: row.verified_by ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    status: row.status,
    escalationLevel: row.escalation_level ?? 0
  };
}

function mapDocument(row: any): DocumentItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    instituteName: row.institute_name,
    instituteId: row.institute_id,
    region: row.region,
    uploadDate: row.upload_date ?? '',
    expiryDate: row.expiry_date ?? '',
    status: row.status,
    fileSize: row.file_size ?? '',
    fileType: row.file_type ?? '',
    renewalOfId: row.renewal_of_id ?? undefined,
    renewalStatus: row.renewal_status ?? undefined,
    expiryTier: row.expiry_tier ?? undefined
  };
}

function mapAlert(row: any): SystemAlert {
  return {
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
    link: row.link ?? undefined,
    region: row.region ?? undefined,
    instituteId: row.institute_id ?? undefined
  };
}

function mapEscalation(row: any): EscalationItem {
  return {
    id: row.id,
    applicationId: row.application_id,
    instituteName: row.institute_name,
    region: row.region,
    raisedBy: row.raised_by,
    raisedDate: row.raised_date,
    urgency: row.urgency,
    reason: row.reason,
    status: row.status,
    level: row.level ?? undefined,
    slaBreachDays: row.sla_breach_days ?? undefined,
    dedupeKey: row.dedupe_key ?? undefined,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    acknowledgedBy: row.acknowledged_by ?? undefined,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined
  };
}

function mapConfig(row: any) {
  return {
    stageSlas: row.stage_slas ?? undefined,
    escalationMatrix: row.escalation_matrix ?? undefined,
    notificationRules: row.notification_rules ?? undefined,
    documentWarningDays: row.document_warning_days ?? undefined,
    undertakingWarningDays: row.undertaking_warning_days ?? undefined,
    businessDaysOnly: row.business_days_only ?? undefined
  };
}

function toAlertRow(alert: SystemAlert) {
  return {
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
    institute_id: alert.instituteId
  };
}

function toEscalationRow(item: EscalationItem) {
  return {
    id: item.id,
    application_id: item.applicationId,
    institute_name: item.instituteName,
    region: item.region,
    raised_by: item.raisedBy,
    raised_date: item.raisedDate,
    urgency: item.urgency,
    reason: item.reason,
    status: item.status,
    level: item.level,
    sla_breach_days: item.slaBreachDays,
    dedupe_key: item.dedupeKey,
    entity_type: item.entityType,
    entity_id: item.entityId,
    acknowledged_by: item.acknowledgedBy,
    acknowledged_at: item.acknowledgedAt,
    resolved_at: item.resolvedAt
  };
}

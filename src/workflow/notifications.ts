import type { Application, NotificationItem, Region, UserRole } from '../types';
import type { DomainEvent } from './types';

export type NotificationDraft = Pick<
  NotificationItem,
  | 'title'
  | 'description'
  | 'category'
  | 'priority'
  | 'link'
  | 'targetRole'
  | 'targetRegion'
  | 'targetInstituteId'
  | 'targetUserId'
  | 'dedupeKey'
  | 'eventType'
>;

function draft(
  event: DomainEvent,
  values: Omit<NotificationDraft, 'dedupeKey' | 'eventType'>
): NotificationDraft {
  return {
    ...values,
    dedupeKey: `${event.type}:${event.entityId}:${event.id}:${values.targetRole ?? 'any'}:${values.targetInstituteId ?? 'all'}`,
    eventType: event.type
  };
}

function regionOf(app?: Application | null): Region | undefined {
  return app?.region;
}

function appLink(app: Application | undefined | null, fallback: string, view: 'officer' | 'institution'): string {
  if (!app) return fallback;
  return view === 'institution' ? '/institution/tracking' : '/applications';
}

export function notificationsForEvent(
  event: DomainEvent,
  app?: Application | null
): NotificationDraft[] {
  const stage = String(event.payload?.toStage ?? app?.stage ?? 'the next stage');
  const appId = app?.id ?? event.entityId;
  const instituteName = app?.instituteName ?? 'the institution';
  const region = regionOf(app);
  const eventRegion =
    region ??
    (typeof event.payload?.region === 'string' ? (event.payload.region as Region) : undefined);
  const eventInstituteId =
    app?.instituteId ??
    (typeof event.payload?.instituteId === 'string' ? event.payload.instituteId : undefined);

  switch (event.type) {
    case 'application.submitted':
      return [
        draft(event, {
          title: `Application ${appId} registered`,
          description: `${instituteName} filed a new application; routing assigned and the scrutiny clock has started.`,
          category: 'application',
          priority: 'low',
          link: appLink(app, '/institution/tracking', 'institution'),
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId,
          targetRegion: region
        })
      ];

    case 'application.forwarded':
      return [
        draft(event, {
          title: `Case ${appId} advanced to ${stage}`,
          description: `${instituteName} — the file moved forward and the stage deadline has been reset.`,
          category: 'application',
          priority: 'medium',
          link: appLink(app, '/applications', 'officer'),
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        }),
        draft(event, {
          title: `Your application ${appId} moved to ${stage}`,
          description: 'Track the new milestone and any statutory deadline in your application dashboard.',
          category: 'application',
          priority: 'low',
          link: appLink(app, '/institution/tracking', 'institution'),
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'application.returned':
      return [
        draft(event, {
          title: `Action required: ${appId} returned for correction`,
          description: `${event.payload?.reasonCode ?? 'Deficiency'} — ${event.payload?.note ?? 'Review the officer note and resubmit.'}`,
          category: 'application',
          priority: 'high',
          link: appLink(app, '/institution/tracking', 'institution'),
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'application.resubmitted':
      return [
        draft(event, {
          title: `${appId} resubmitted by ${instituteName}`,
          description: 'Corrections received; the statutory scrutiny clock has restarted.',
          category: 'application',
          priority: 'medium',
          link: appLink(app, '/applications', 'officer'),
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        })
      ];

    case 'application.reverted':
      return [
        draft(event, {
          title: `${appId} reverted to ${stage}`,
          description: `${event.payload?.reasonCode ?? 'Reverted'} — ${event.payload?.note ?? 'An earlier stage must be revisited.'}`,
          category: 'application',
          priority: 'medium',
          link: appLink(app, '/applications', 'officer'),
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        }),
        draft(event, {
          title: `Your application ${appId} was sent back to ${stage}`,
          description: 'The case is being re-examined at an earlier stage.',
          category: 'application',
          priority: 'low',
          link: appLink(app, '/institution/tracking', 'institution'),
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'application.approved':
      return [
        draft(event, {
          title: `Approval granted for ${appId}`,
          description: `Final approval recorded by ${String(event.payload?.competentAuthority ?? event.actorName ?? 'the competent authority')}.`,
          category: 'application',
          priority: 'high',
          link: appLink(app, '/institution/tracking', 'institution'),
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'application.rejected':
      return [
        draft(event, {
          title: `Application ${appId} rejected`,
          description: `${event.payload?.reasonCode ?? 'Statutory ground'} — ${event.payload?.note ?? 'See the decision record.'}`,
          category: 'application',
          priority: 'high',
          link: appLink(app, '/institution/tracking', 'institution'),
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'evc.scheduled':
    case 'evc.rescheduled':
      return [
        draft(event, {
          title: `EVC inspection ${event.type === 'evc.scheduled' ? 'scheduled' : 'rescheduled'}: ${instituteName}`,
          description: `Committee ${String(event.payload?.committee ?? 'panel')} will inspect the campus. Report due within the configured SLA.`,
          category: 'evc',
          priority: 'high',
          link: '/evc-scheduling',
          targetRole: 'EVC_MEMBER',
          targetRegion: region
        }),
        draft(event, {
          title: `Inspection ${event.type === 'evc.scheduled' ? 'scheduled' : 'rescheduled'} for ${appId}`,
          description: 'Prepare the campus records and evidence for the Expert Visit Committee.',
          category: 'evc',
          priority: 'medium',
          link: '/evc-scheduling',
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'evc.cancelled':
      return [
        draft(event, {
          title: `EVC inspection cancelled: ${instituteName}`,
          description: 'The inspection has been cancelled; a fresh date will be notified.',
          category: 'evc',
          priority: 'medium',
          link: '/evc-scheduling',
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: app?.instituteId
        })
      ];

    case 'evc.completed':
      return [
        draft(event, {
          title: `EVC report submitted for ${appId}`,
          description: 'The inspection report is on record and the case can proceed in the route.',
          category: 'evc',
          priority: 'medium',
          link: '/applications',
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        })
      ];

    case 'evc.report_overdue':
      return [
        draft(event, {
          title: `EVC report overdue for ${appId}`,
          description: 'The inspection report has crossed its deadline and has been escalated.',
          category: 'evc',
          priority: 'high',
          link: '/evc-scheduling',
          targetRole: 'AICTE_ADMIN'
        })
      ];

    case 'application.deadline_approaching':
    case 'application.deadline_breached':
      return [
        draft(event, {
          title:
            event.type === 'application.deadline_breached'
              ? `SLA breached: ${appId}`
              : `Deadline approaching: ${appId}`,
          description: `${instituteName} is at ${stage}. ${String(event.payload?.detail ?? 'Review the case and act before the statutory deadline.')}`,
          category: 'application',
          priority: event.type === 'application.deadline_breached' ? 'high' : 'medium',
          link: appLink(app, '/applications', 'officer'),
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        })
      ];

    case 'undertaking.created':
    case 'undertaking.submitted':
    case 'undertaking.verified':
    case 'undertaking.rejected':
    case 'undertaking.overdue': {
      const priority: NotificationDraft['priority'] =
        event.type === 'undertaking.overdue' || event.type === 'undertaking.rejected' ? 'high' : 'medium';
      const isInstitutionAction =
        event.type === 'undertaking.created' || event.type === 'undertaking.rejected' || event.type === 'undertaking.overdue';
      return [
        draft(event, {
          title:
            event.type === 'undertaking.overdue'
              ? `Undertaking overdue for ${appId}`
              : `Undertaking ${event.type.split('.')[1]} for ${appId}`,
          description: String(event.payload?.detail ?? 'A time-bound compliance condition requires attention.'),
          category: 'compliance',
          priority,
          link: '/compliance',
          targetRole: isInstitutionAction ? 'INSTITUTION_ADMIN' : 'AICTE_ADMIN',
          targetInstituteId: isInstitutionAction ? app?.instituteId : undefined,
          targetRegion: isInstitutionAction ? undefined : region
        })
      ];
    }

    case 'compliance.submitted':
    case 'compliance.verified':
      return [
        draft(event, {
          title:
            event.type === 'compliance.verified'
              ? 'Compliance evidence verified'
              : 'Compliance evidence submitted',
          description: String(event.payload?.detail ?? 'A compliance submission was recorded against the institution.'),
          category: 'compliance',
          priority: event.type === 'compliance.verified' ? 'low' : 'medium',
          link: '/compliance',
          targetRole: event.type === 'compliance.verified' ? 'INSTITUTION_ADMIN' : 'AICTE_ADMIN',
          targetInstituteId: event.type === 'compliance.verified' ? app?.instituteId : undefined,
          targetRegion: event.type === 'compliance.verified' ? undefined : region
        })
      ];

    case 'document.uploaded':
      return [
        draft(event, {
          title: 'Document submitted for verification',
          description: String(event.payload?.detail ?? 'A document was uploaded for officer verification.'),
          category: 'system',
          priority: 'medium',
          link: '/documents',
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: eventRegion
        })
      ];

    case 'document.renewal_requested':
      return [
        draft(event, {
          title: 'Renewal requested for expiring document',
          description: String(event.payload?.detail ?? 'The institution has started a document renewal.'),
          category: 'system',
          priority: 'medium',
          link: '/documents',
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: eventRegion
        })
      ];

    case 'document.renewal_submitted':
      return [
        draft(event, {
          title: 'Renewal evidence awaiting verification',
          description: String(event.payload?.detail ?? 'New validity evidence was submitted and needs officer verification.'),
          category: 'system',
          priority: 'high',
          link: '/documents',
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: eventRegion
        })
      ];

    case 'document.verified':
    case 'document.renewal_verified':
      return [
        draft(event, {
          title:
            event.type === 'document.renewal_verified'
              ? 'Document renewal verified'
              : 'Document verified',
          description: String(event.payload?.detail ?? 'The validity record was verified by an authorised officer.'),
          category: 'system',
          priority: 'low',
          link: '/documents',
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: eventInstituteId
        })
      ];

    case 'document.rejected':
    case 'document.renewal_rejected':
      return [
        draft(event, {
          title:
            event.type === 'document.renewal_rejected'
              ? 'Document renewal rejected'
              : 'Document rejected',
          description: String(event.payload?.detail ?? 'The evidence was rejected. Review the remarks and resubmit.'),
          category: 'system',
          priority: 'high',
          link: '/documents',
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: eventInstituteId
        })
      ];

    case 'document.expiring':
    case 'document.expired':
      return [
        draft(event, {
          title:
            event.type === 'document.expired'
              ? 'Document expired: renewal required'
              : 'Document validity expiring',
          description: String(event.payload?.detail ?? 'Update the validity evidence for this institution.'),
          category: 'system',
          priority: event.type === 'document.expired' ? 'high' : 'medium',
          link: '/documents',
          targetRole: 'INSTITUTION_ADMIN',
          targetInstituteId: eventInstituteId
        })
      ];

    case 'escalation.raised':
      return [
        draft(event, {
          title: `Escalation: ${String(event.payload?.detail ?? appId)}`,
          description: 'A statutory deadline has escalated to your level for intervention.',
          category: 'system',
          priority: 'high',
          link: '/regional/escalations',
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        })
      ];

    case 'escalation.resolved':
      return [
        draft(event, {
          title: `Escalation resolved: ${appId}`,
          description: 'The underlying deadline breach has been closed.',
          category: 'system',
          priority: 'low',
          link: '/regional/escalations',
          targetRole: 'REGIONAL_OFFICER',
          targetRegion: region
        })
      ];

    default:
      return [];
  }
}

export function notificationTargetsRole(draft: NotificationDraft, role: UserRole): boolean {
  return !draft.targetRole || draft.targetRole === role;
}

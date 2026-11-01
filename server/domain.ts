import type { Prisma } from '@prisma/client';
import type { Application, User } from '../src/types/index.ts';
import { resolveWorkflowConfig } from '../src/workflow/config.ts';
import type { ActorRef, WorkflowContext } from '../src/workflow/types.ts';
import { toSystemConfig } from './mappers/admin.ts';

export function actorFromUser(user: User): ActorRef {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    region: user.region,
    instituteId: user.instituteId
  };
}

export async function loadWorkflowContext(
  client: Prisma.TransactionClient,
  app: Application
): Promise<WorkflowContext> {
  const [visitRow, undertakingRows, configRow] = await Promise.all([
    app.evcVisitId
      ? client.eVCVisit.findUnique({ where: { id: app.evcVisitId } })
      : client.eVCVisit.findFirst({ where: { applicationId: app.id } }),
    client.undertaking.findMany({ where: { applicationId: app.id } }),
    client.systemConfig.findUnique({ where: { id: 'default' } })
  ]);

  return {
    evcVisit: visitRow
      ? {
          id: visitRow.id,
          status: visitRow.status,
          reportSubmitted: visitRow.reportSubmitted ?? undefined,
          reportSubmittedAt: visitRow.reportSubmittedAt ?? undefined
        }
      : undefined,
    undertakings: undertakingRows.map((row) => ({ id: row.id, status: row.status })),
    config: resolveWorkflowConfig(configRow ? toSystemConfig(configRow) : null)
  };
}

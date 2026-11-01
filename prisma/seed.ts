import { PrismaClient } from '@prisma/client';
import type { Permission, User, UserRole } from '../src/types/index.ts';
import { ROLE_DEFAULT_PERMISSIONS } from '../src/services/rbacService.ts';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CONFIG,
  INITIAL_USERS,
  DEMO_PASSWORD
} from '../src/data/demoUsers.ts';
import {
  initialApplications,
  initialComplianceRecords,
  initialDocuments,
  initialEVCVisits,
  initialInstitutes,
  initialNotifications,
  initialUndertakings
} from '../src/data/initialData.ts';
import { hashPassword } from '../server/password.ts';
import {
  toApplicationData,
  toAuditLogData,
  toComplianceRecordData,
  toDocumentItemData,
  toEVCVisitData,
  toInstituteData,
  toNotificationData,
  toSystemConfigData,
  toUndertakingData,
  toUserData
} from '../server/mappers/index.ts';

const prisma = new PrismaClient();

async function seedUsers() {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  for (const user of INITIAL_USERS) {
    const domainUser: User = { ...user };
    const data = toUserData(domainUser, passwordHash);
    await prisma.user.upsert({ where: { id: user.id }, create: data, update: data });
  }
}

async function seedRolePermissions() {
  const roles = Object.entries(ROLE_DEFAULT_PERMISSIONS) as [UserRole, Permission[]][];
  for (const [role, permissions] of roles) {
    await prisma.rolePermission.upsert({
      where: { role },
      create: { role, permissions },
      update: { permissions }
    });
  }
}

async function seedConfig() {
  const data = toSystemConfigData(INITIAL_CONFIG);
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    create: data,
    update: data
  });
}

async function main() {
  await seedUsers();
  await seedRolePermissions();
  await seedConfig();

  for (const institute of initialInstitutes) {
    const data = toInstituteData(institute);
    await prisma.institute.upsert({ where: { id: institute.id }, create: data, update: data });
  }

  for (const application of initialApplications) {
    const data = toApplicationData(application);
    await prisma.application.upsert({
      where: { id: application.id },
      create: data,
      update: data
    });
  }

  for (const visit of initialEVCVisits) {
    const data = toEVCVisitData(visit);
    await prisma.eVCVisit.upsert({ where: { id: visit.id }, create: data, update: data });
  }

  for (const record of initialComplianceRecords) {
    const data = toComplianceRecordData(record);
    await prisma.complianceRecord.upsert({
      where: { id: record.id },
      create: data,
      update: data
    });
  }

  for (const document of initialDocuments) {
    const data = toDocumentItemData(document);
    await prisma.documentItem.upsert({
      where: { id: document.id },
      create: data,
      update: data
    });
  }

  for (const undertaking of initialUndertakings) {
    const data = toUndertakingData(undertaking);
    await prisma.undertaking.upsert({
      where: { id: undertaking.id },
      create: data,
      update: data
    });
  }

  for (const notification of initialNotifications) {
    const data = toNotificationData(notification);
    await prisma.notificationItem.upsert({
      where: { id: notification.id },
      create: data,
      update: data
    });
  }

  for (const log of INITIAL_AUDIT_LOGS) {
    const data = toAuditLogData(log);
    await prisma.auditLog.upsert({ where: { id: log.id }, create: data, update: data });
  }

  console.log(
    `Seeded ${INITIAL_USERS.length} users, ${initialApplications.length} applications, ` +
      `${initialInstitutes.length} institutes, ${initialEVCVisits.length} EVC visits, ` +
      `${initialComplianceRecords.length} compliance records, ${initialDocuments.length} documents, ` +
      `${initialUndertakings.length} undertakings and ${initialNotifications.length} notifications.`
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

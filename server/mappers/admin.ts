import type {
  RolePermission as RolePermissionRow,
  SystemConfig as SystemConfigRow,
  User as UserRow
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  EscalationRule,
  NotificationRule,
  Permission,
  StageSla,
  SystemConfig,
  User,
  UserRole
} from '../../src/types/index.ts';
import { asArray, optional } from './json.ts';

export function toSystemConfig(row: SystemConfigRow): SystemConfig {
  return {
    maintenanceMode: row.maintenanceMode,
    academicYear: row.academicYear,
    approvalCycleEndDate: row.approvalCycleEndDate,
    evcMinMembers: row.evcMinMembers,
    autoEscalationDays: row.autoEscalationDays,
    notificationEmailAlerts: row.notificationEmailAlerts,
    requireTwoFactorForAdmin: row.requireTwoFactorForAdmin,
    maxUploadSizeMB: row.maxUploadSizeMB,
    stageSlas: row.stageSlas
      ? (row.stageSlas as Partial<Record<string, StageSla>> as SystemConfig['stageSlas'])
      : undefined,
    escalationMatrix: row.escalationMatrix
      ? asArray<EscalationRule>(row.escalationMatrix)
      : undefined,
    notificationRules: row.notificationRules
      ? asArray<NotificationRule>(row.notificationRules)
      : undefined,
    documentWarningDays: row.documentWarningDays.length ? row.documentWarningDays : undefined,
    undertakingWarningDays: row.undertakingWarningDays.length
      ? row.undertakingWarningDays
      : undefined,
    businessDaysOnly: optional(row.businessDaysOnly)
  };
}

export function toSystemConfigData(
  config: SystemConfig
): Prisma.SystemConfigUncheckedCreateInput {
  return {
    id: 'default',
    maintenanceMode: config.maintenanceMode,
    academicYear: config.academicYear,
    approvalCycleEndDate: config.approvalCycleEndDate,
    evcMinMembers: config.evcMinMembers,
    autoEscalationDays: config.autoEscalationDays,
    notificationEmailAlerts: config.notificationEmailAlerts,
    requireTwoFactorForAdmin: config.requireTwoFactorForAdmin,
    maxUploadSizeMB: config.maxUploadSizeMB,
    stageSlas: config.stageSlas
      ? (config.stageSlas as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    escalationMatrix: config.escalationMatrix
      ? (config.escalationMatrix as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    notificationRules: config.notificationRules
      ? (config.notificationRules as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    documentWarningDays: config.documentWarningDays ?? [],
    undertakingWarningDays: config.undertakingWarningDays ?? [],
    businessDaysOnly: config.businessDaysOnly ?? null
  };
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    roleTitle: row.roleTitle,
    permissions: row.permissions as Permission[],
    avatar: optional(row.avatar),
    initials: row.initials,
    phone: optional(row.phone),
    designation: optional(row.designation),
    region: (row.region ?? undefined) as User['region'],
    instituteId: optional(row.instituteId),
    instituteName: optional(row.instituteName),
    committeeName: optional(row.committeeName),
    isActive: row.isActive,
    createdAt: row.createdAt,
    lastLogin: optional(row.lastLogin)
  };
}

export function toUserData(user: User, passwordHash: string): Prisma.UserUncheckedCreateInput {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleTitle: user.roleTitle,
    permissions: user.permissions,
    avatar: user.avatar ?? null,
    initials: user.initials,
    phone: user.phone ?? null,
    designation: user.designation ?? null,
    region: user.region ?? null,
    instituteId: user.instituteId ?? null,
    instituteName: user.instituteName ?? null,
    committeeName: user.committeeName ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin ?? null,
    passwordHash
  };
}

export function toRolePermissions(row: RolePermissionRow): {
  role: UserRole;
  permissions: Permission[];
} {
  return {
    role: row.role as UserRole,
    permissions: row.permissions as Permission[]
  };
}

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "appliedDate" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "intakeProposed" INTEGER NOT NULL,
    "programs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "documents" JSONB NOT NULL,
    "remarks" TEXT,
    "routeId" TEXT,
    "stageEnteredAt" TEXT,
    "stageDueAt" TEXT,
    "slaTier" TEXT,
    "assignedOfficerId" TEXT,
    "deficiencies" JSONB,
    "returns" JSONB,
    "decision" JSONB,
    "caseSummary" TEXT,
    "evcVisitId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastActionBy" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "establishedYear" INTEGER NOT NULL,
    "principalName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approvedSeats" INTEGER NOT NULL,
    "accreditedPrograms" INTEGER NOT NULL,
    "complianceScore" INTEGER NOT NULL,
    "activeApplicationsCount" INTEGER NOT NULL,

    CONSTRAINT "institutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evc_visits" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "instituteId" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "stateRegion" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "displayDate" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "assignedCommittee" TEXT NOT NULL,
    "committeeMembers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mode" TEXT NOT NULL,
    "reportSubmitted" BOOLEAN,
    "scheduledAt" TEXT,
    "reportDueAt" TEXT,
    "reportSubmittedAt" TEXT,
    "slaTier" TEXT,
    "escalationLevel" INTEGER,
    "report" JSONB,
    "checklist" JSONB,
    "evidenceFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "evc_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_records" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "submissionDate" TEXT,
    "documentRef" TEXT,
    "urgency" TEXT NOT NULL,
    "undertakingId" TEXT,
    "verifiedAt" TEXT,
    "verifiedBy" TEXT,
    "escalationLevel" INTEGER,

    CONSTRAINT "compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "uploadDate" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "documentTypeCode" TEXT,
    "renewalOfId" TEXT,
    "renewalStatus" TEXT,
    "renewalNote" TEXT,
    "verifiedBy" TEXT,
    "storagePath" TEXT,
    "expiryTier" TEXT,

    CONSTRAINT "document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "undertakings" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "conditionCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "evidenceDocumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedAt" TEXT,
    "submittedBy" TEXT,
    "verifiedAt" TEXT,
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "status" TEXT NOT NULL,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "undertakings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL,
    "link" TEXT,
    "targetRole" TEXT,
    "targetRegion" TEXT,
    "targetInstituteId" TEXT,
    "targetUserId" TEXT,
    "dedupeKey" TEXT,
    "eventType" TEXT,

    CONSTRAINT "notification_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "region" TEXT,
    "instituteId" TEXT,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_items" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "raisedDate" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "level" INTEGER,
    "slaBreachDays" INTEGER,
    "dedupeKey" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TEXT,
    "resolvedAt" TEXT,

    CONSTRAINT "escalation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "previousState" TEXT,
    "newState" TEXT,
    "ipAddress" TEXT NOT NULL,
    "eventType" TEXT,
    "correlationId" TEXT,
    "source" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "academicYear" TEXT NOT NULL,
    "approvalCycleEndDate" TEXT NOT NULL,
    "evcMinMembers" INTEGER NOT NULL,
    "autoEscalationDays" INTEGER NOT NULL,
    "notificationEmailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "requireTwoFactorForAdmin" BOOLEAN NOT NULL DEFAULT false,
    "maxUploadSizeMB" INTEGER NOT NULL,
    "stageSlas" JSONB,
    "escalationMatrix" JSONB,
    "notificationRules" JSONB,
    "documentWarningDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "undertakingWarningDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "businessDaysOnly" BOOLEAN,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatar" TEXT,
    "initials" TEXT NOT NULL,
    "phone" TEXT,
    "designation" TEXT,
    "region" TEXT,
    "instituteId" TEXT,
    "instituteName" TEXT,
    "committeeName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TEXT NOT NULL,
    "lastLogin" TEXT,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "currentPath" TEXT,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaderId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "applications_region_idx" ON "applications"("region");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_instituteId_idx" ON "applications"("instituteId");

-- CreateIndex
CREATE INDEX "institutes_region_idx" ON "institutes"("region");

-- CreateIndex
CREATE INDEX "institutes_status_idx" ON "institutes"("status");

-- CreateIndex
CREATE INDEX "evc_visits_applicationId_idx" ON "evc_visits"("applicationId");

-- CreateIndex
CREATE INDEX "evc_visits_instituteId_idx" ON "evc_visits"("instituteId");

-- CreateIndex
CREATE INDEX "evc_visits_region_idx" ON "evc_visits"("region");

-- CreateIndex
CREATE INDEX "evc_visits_status_idx" ON "evc_visits"("status");

-- CreateIndex
CREATE INDEX "compliance_records_instituteId_idx" ON "compliance_records"("instituteId");

-- CreateIndex
CREATE INDEX "compliance_records_region_idx" ON "compliance_records"("region");

-- CreateIndex
CREATE INDEX "compliance_records_status_idx" ON "compliance_records"("status");

-- CreateIndex
CREATE INDEX "compliance_records_dueDate_idx" ON "compliance_records"("dueDate");

-- CreateIndex
CREATE INDEX "document_items_instituteId_idx" ON "document_items"("instituteId");

-- CreateIndex
CREATE INDEX "document_items_region_idx" ON "document_items"("region");

-- CreateIndex
CREATE INDEX "document_items_status_idx" ON "document_items"("status");

-- CreateIndex
CREATE INDEX "document_items_expiryDate_idx" ON "document_items"("expiryDate");

-- CreateIndex
CREATE INDEX "undertakings_applicationId_idx" ON "undertakings"("applicationId");

-- CreateIndex
CREATE INDEX "undertakings_instituteId_idx" ON "undertakings"("instituteId");

-- CreateIndex
CREATE INDEX "undertakings_region_idx" ON "undertakings"("region");

-- CreateIndex
CREATE INDEX "undertakings_status_idx" ON "undertakings"("status");

-- CreateIndex
CREATE INDEX "undertakings_dueDate_idx" ON "undertakings"("dueDate");

-- CreateIndex
CREATE INDEX "notification_items_dedupeKey_idx" ON "notification_items"("dedupeKey");

-- CreateIndex
CREATE INDEX "notification_items_targetRole_idx" ON "notification_items"("targetRole");

-- CreateIndex
CREATE INDEX "notification_items_targetUserId_idx" ON "notification_items"("targetUserId");

-- CreateIndex
CREATE INDEX "notification_items_targetRegion_idx" ON "notification_items"("targetRegion");

-- CreateIndex
CREATE INDEX "notification_items_targetInstituteId_idx" ON "notification_items"("targetInstituteId");

-- CreateIndex
CREATE UNIQUE INDEX "system_alerts_dedupeKey_key" ON "system_alerts"("dedupeKey");

-- CreateIndex
CREATE INDEX "system_alerts_status_idx" ON "system_alerts"("status");

-- CreateIndex
CREATE INDEX "system_alerts_region_idx" ON "system_alerts"("region");

-- CreateIndex
CREATE INDEX "system_alerts_entityType_entityId_idx" ON "system_alerts"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "escalation_items_applicationId_idx" ON "escalation_items"("applicationId");

-- CreateIndex
CREATE INDEX "escalation_items_dedupeKey_idx" ON "escalation_items"("dedupeKey");

-- CreateIndex
CREATE INDEX "escalation_items_region_idx" ON "escalation_items"("region");

-- CreateIndex
CREATE INDEX "escalation_items_status_idx" ON "escalation_items"("status");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "assistant_messages_userId_idx" ON "assistant_messages"("userId");

-- CreateIndex
CREATE INDEX "file_objects_uploaderId_idx" ON "file_objects"("uploaderId");

-- CreateIndex
CREATE INDEX "file_objects_documentId_idx" ON "file_objects"("documentId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


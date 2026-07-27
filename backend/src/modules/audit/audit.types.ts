export type AuditOutcomeValue = "SUCCESS" | "FAILURE";

export type AuditRequestContext = {
  requestMethod?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CreateAuditLogInput = {
  actorId?: string | null;
  actorRole: "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN" | "SYSTEM";
  action: string;
  entityType: string;
  entityId?: string | null;
  patientId?: string | null;
  outcome?: AuditOutcomeValue;
  description: string;
  metadata?: Record<string, unknown> | null;
  requestContext?: AuditRequestContext | null;
};
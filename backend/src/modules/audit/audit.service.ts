import type { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../config/prisma.js";
import type {
  AuditRequestContext,
  CreateAuditLogInput,
} from "./audit.types.js";

const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_TYPE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_REQUEST_VALUE_LENGTH = 500;
const MAX_METADATA_STRING_LENGTH = 500;

const SENSITIVE_METADATA_KEYS = [
  "password",
  "passwordhash",
  "token",
  "authorization",
  "secret",
  "base64",
  "datauri",
  "privatekey",
  "rawfile",
];

const cleanRequiredValue = (
  value: unknown,
  fieldName: string,
  maxLength: number
) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required for audit logging`);
  }

  return value.trim().slice(0, maxLength);
};

const cleanOptionalValue = (
  value: unknown,
  maxLength: number
): string | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim().slice(0, maxLength);
};

const shouldRedactKey = (key: string) => {
  const normalizedKey = key.toLowerCase();

  return SENSITIVE_METADATA_KEYS.some((sensitiveKey) =>
    normalizedKey.includes(sensitiveKey)
  );
};

const sanitizeMetadata = (
  metadata?: Record<string, unknown> | null
): Prisma.InputJsonValue | undefined => {
  if (!metadata) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(metadata, (key, value) => {
      if (shouldRedactKey(key)) {
        return "[REDACTED]";
      }

      if (
        typeof value === "string" &&
        value.length > MAX_METADATA_STRING_LENGTH
      ) {
        return `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`;
      }

      return value;
    });

    if (!serialized) {
      return undefined;
    }

    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    return {
      auditMetadataError: "Metadata could not be safely serialized",
    };
  }
};

const normalizeRequestContext = (
  requestContext?: AuditRequestContext | null
) => {
  return {
    requestMethod: cleanOptionalValue(
      requestContext?.requestMethod,
      MAX_REQUEST_VALUE_LENGTH
    ),
    requestPath: cleanOptionalValue(
      requestContext?.requestPath,
      MAX_REQUEST_VALUE_LENGTH
    ),
    ipAddress: cleanOptionalValue(
      requestContext?.ipAddress,
      MAX_REQUEST_VALUE_LENGTH
    ),
    userAgent: cleanOptionalValue(
      requestContext?.userAgent,
      MAX_REQUEST_VALUE_LENGTH
    ),
  };
};

const createAuditLog = async (input: CreateAuditLogInput) => {
  const action = cleanRequiredValue(
    input.action,
    "Audit action",
    MAX_ACTION_LENGTH
  );

  const entityType = cleanRequiredValue(
    input.entityType,
    "Audit entity type",
    MAX_ENTITY_TYPE_LENGTH
  );

  const description = cleanRequiredValue(
    input.description,
    "Audit description",
    MAX_DESCRIPTION_LENGTH
  );

  const requestContext = normalizeRequestContext(input.requestContext);
  const metadata = sanitizeMetadata(input.metadata);

  return prisma.auditLog.create({
    data: {
      actorId: cleanOptionalValue(input.actorId, 100),
      actorRole: cleanRequiredValue(
        input.actorRole,
        "Audit actor role",
        50
      ),
      action,
      entityType,
      entityId: cleanOptionalValue(input.entityId, 100),
      patientId: cleanOptionalValue(input.patientId, 100),
      outcome: input.outcome || "SUCCESS",
      description,
      metadata,
      requestMethod: requestContext.requestMethod,
      requestPath: requestContext.requestPath,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    },
  });
};

export const auditService = {
  async record(input: CreateAuditLogInput) {
    return createAuditLog(input);
  },

  async recordSuccess(
    input: Omit<CreateAuditLogInput, "outcome">
  ) {
    return createAuditLog({
      ...input,
      outcome: "SUCCESS",
    });
  },

  async recordFailure(
    input: Omit<CreateAuditLogInput, "outcome">
  ) {
    return createAuditLog({
      ...input,
      outcome: "FAILURE",
    });
  },

  async safeRecord(input: CreateAuditLogInput) {
    try {
      return await createAuditLog(input);
    } catch (error) {
      console.error("AUDIT LOG WRITE FAILED", {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        error:
          error instanceof Error
            ? error.message
            : "Unknown audit logging error",
      });

      return null;
    }
  },
};
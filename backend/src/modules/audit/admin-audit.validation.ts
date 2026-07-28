import { z } from "zod";

const getSingleQueryValue = (value: unknown) => {
  return Array.isArray(value) ? value[0] : value;
};

const normalizeUppercaseQueryValue = (value: unknown) => {
  const singleValue = getSingleQueryValue(value);

  if (typeof singleValue !== "string") {
    return singleValue;
  }

  const cleanedValue = singleValue.trim();

  return cleanedValue ? cleanedValue.toUpperCase() : undefined;
};

const normalizeQueryValue = (value: unknown) => {
  const singleValue = getSingleQueryValue(value);

  if (typeof singleValue !== "string") {
    return singleValue;
  }

  const cleanedValue = singleValue.trim();

  return cleanedValue || undefined;
};

const normalizeNumberQueryValue = (value: unknown) => {
  const singleValue = getSingleQueryValue(value);

  if (
    singleValue === undefined ||
    singleValue === null ||
    singleValue === ""
  ) {
    return undefined;
  }

  if (typeof singleValue === "number") {
    return singleValue;
  }

  if (typeof singleValue === "string") {
    return Number(singleValue);
  }

  return singleValue;
};

const auditDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date must be valid",
  });

export const adminAuditLogsQuerySchema = z
  .object({
    actorRole: z.preprocess(
      normalizeUppercaseQueryValue,
      z
        .enum([
          "PATIENT",
          "DOCTOR",
          "CAREGIVER",
          "PHARMACY",
          "ADMIN",
          "SYSTEM",
        ])
        .optional()
    ),
    action: z.preprocess(
      normalizeUppercaseQueryValue,
      z.string().trim().min(1).max(100).optional()
    ),
    outcome: z.preprocess(
      normalizeUppercaseQueryValue,
      z.enum(["SUCCESS", "FAILURE"]).optional()
    ),
    entityType: z.preprocess(
      normalizeUppercaseQueryValue,
      z.string().trim().min(1).max(100).optional()
    ),
    fromDate: z.preprocess(
      normalizeQueryValue,
      auditDateSchema.optional()
    ),
    toDate: z.preprocess(
      normalizeQueryValue,
      auditDateSchema.optional()
    ),
    search: z.preprocess(
      normalizeQueryValue,
      z.string().trim().min(1).max(150).optional()
    ),
    page: z.preprocess(
      normalizeNumberQueryValue,
      z.number().int().min(1).default(1)
    ),
    limit: z.preprocess(
      normalizeNumberQueryValue,
      z.number().int().min(1).max(100).default(20)
    ),
  })
  .refine(
    (data) => {
      if (!data.fromDate || !data.toDate) {
        return true;
      }

      return Date.parse(data.fromDate) <= Date.parse(data.toDate);
    },
    {
      message: "From date cannot be after to date",
      path: ["toDate"],
    }
  );

export const adminAuditLogParamsSchema = z.object({
  auditLogId: z.string().trim().uuid("Audit log ID must be a valid UUID"),
});

export type AdminAuditLogsQuery = z.infer<
  typeof adminAuditLogsQuerySchema
>;
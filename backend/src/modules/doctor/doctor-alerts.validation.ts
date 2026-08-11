import { z } from "zod";

export const doctorAlertsQuerySchema = z
  .object({
    status: z
      .enum([
        "ALL",
        "ACTIVE",
        "CANCELLED",
        "ESCALATED",
        "RESOLVED",
      ])
      .optional()
      .default("ALL"),
  })
  .passthrough();

export const doctorAlertParamsSchema = z.object({
  alertId: z.string().uuid("Valid safety alert ID is required"),
});

export type DoctorAlertsQueryInput = z.infer<
  typeof doctorAlertsQuerySchema
>;

export type DoctorAlertParamsInput = z.infer<
  typeof doctorAlertParamsSchema
>;
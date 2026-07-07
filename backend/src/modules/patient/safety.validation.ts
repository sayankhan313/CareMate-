import { z } from "zod";

export const createSafetyAlertSchema = z.object({
  vitalReadingId: z.string().uuid("Invalid vital reading id.").optional(),

  reason: z.string().trim().optional(),
});

export const safetyAlertIdParamsSchema = z.object({
  alertId: z.string().uuid("Invalid safety alert id."),
});
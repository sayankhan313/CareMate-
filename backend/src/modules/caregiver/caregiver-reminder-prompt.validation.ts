import { z } from "zod";

export const caregiverReminderPromptParamsSchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
  doseLogId: z.string().uuid("Valid dose log ID is required"),
});
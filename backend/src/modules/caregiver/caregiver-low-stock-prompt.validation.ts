import { z } from "zod";

export const caregiverLowStockPromptParamsSchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
  medicineId: z.string().uuid("Valid medicine ID is required"),
});
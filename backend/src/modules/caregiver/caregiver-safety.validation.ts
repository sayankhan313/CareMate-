import { z } from "zod";

export const caregiverSafetyPatientParamsSchema = z.object({ patientId: z.string().uuid("Valid patient ID is required") });
export const caregiverSafetyAlertParamsSchema = z.object({ patientId: z.string().uuid("Valid patient ID is required"), alertId: z.string().uuid("Valid safety alert ID is required") });
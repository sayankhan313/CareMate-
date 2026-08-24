import { z } from "zod";

export const caregiverPatientParamsSchema = z.object({ patientId: z.string().uuid("Valid patient ID is required") });
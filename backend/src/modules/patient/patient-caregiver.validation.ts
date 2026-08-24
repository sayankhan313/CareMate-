import { z } from "zod";

export const patientCaregiverRelationshipParamsSchema = z.object({ relationshipId: z.string().uuid("Valid caregiver relationship ID is required") });
import { z } from "zod";

export const caregiverLinkRequestSchema = z.object({
  patientEmail: z.string().trim().toLowerCase().email("Please enter a valid patient email address"),
});

export type CaregiverLinkRequestInput = z.infer<typeof caregiverLinkRequestSchema>;
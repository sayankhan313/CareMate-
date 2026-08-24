
import { z } from "zod";

export const caregiverPharmacyOrdersPatientParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
});

export const caregiverPharmacyOrderParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  orderId: z.string().uuid("Invalid pharmacy order id."),
});
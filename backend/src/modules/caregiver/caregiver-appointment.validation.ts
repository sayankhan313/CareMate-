import { z } from "zod";

export const caregiverAppointmentPatientParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
});

export const caregiverAppointmentDoctorParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  doctorId: z.string().uuid("Invalid doctor id."),
});

export const caregiverAppointmentMonthQuerySchema = z.object({
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format."),
});

export const caregiverAppointmentSlotsQuerySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
});

export const caregiverCreateAppointmentSchema = z.object({
  doctorId: z.string().uuid("Please select a valid assigned doctor."),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters.").max(250, "Reason must be less than 250 characters."),
  preferredDate: z.string().trim().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be DD/MM/YYYY."),
  preferredTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be HH:mm."),
});

export type CaregiverCreateAppointmentInput = z.infer<typeof caregiverCreateAppointmentSchema>;
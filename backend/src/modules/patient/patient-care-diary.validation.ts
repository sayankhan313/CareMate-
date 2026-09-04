import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const createPatientCareDiarySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),
  note: z.string().trim().min(1, "Diary note is required").max(5000, "Diary note must be 5000 characters or fewer"),
  mood: optionalText(80),
  symptoms: optionalText(1000),
  entryDate: z.coerce.date().optional(),
});

export const updatePatientCareDiarySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer").optional(),
  note: z.string().trim().min(1, "Diary note is required").max(5000, "Diary note must be 5000 characters or fewer").optional(),
  mood: optionalText(80),
  symptoms: optionalText(1000),
  entryDate: z.coerce.date().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one diary field must be provided" });

export type CreatePatientCareDiaryInput = z.infer<typeof createPatientCareDiarySchema>;
export type UpdatePatientCareDiaryInput = z.infer<typeof updatePatientCareDiarySchema>;
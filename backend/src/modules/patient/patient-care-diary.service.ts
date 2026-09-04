import { prisma } from "../../config/prisma.js";
import { notificationService } from "../notification/notification.service.js";
import { AppError } from "../../utils/AppError.js";
import type { CreatePatientCareDiaryInput, UpdatePatientCareDiaryInput } from "./patient-care-diary.validation.js";

const diarySelect = {
  id: true,
  title: true,
  note: true,
  mood: true,
  symptoms: true,
  entryDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

const normalizeOptionalText = (value?: string | null) => {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const findPatientEntry = async (patientId: string, entryId: string) => {
  const entry = await prisma.patientCareDiaryEntry.findFirst({
    where: { id: entryId, patientId },
    select: diarySelect,
  });

  if (!entry) throw new AppError("Care diary entry not found", 404);
  return entry;
};

const notifyAssignedDoctors = async (patientId: string, entryId: string) => {
  const [patient, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { fullName: true },
    }),
    prisma.patientDoctorAssignment.findMany({
      where: { patientId, status: "ACTIVE" },
      select: { doctorId: true },
    }),
  ]);

  if (!patient || assignments.length === 0) return;

  await Promise.allSettled(
    assignments.map(assignment =>
      notificationService.createAndSend({
        userId: assignment.doctorId,
        type: "PATIENT_CARE_DIARY_ADDED",
        title: "New Care Diary Entry",
        body: `${patient.fullName} added a new Care Diary entry.`,
        priority: "NORMAL",
        entityType: "PATIENT_CARE_DIARY_ENTRY",
        entityId: entryId,
        targetScreen: "DoctorPatientDetail",
        data: {
          patientId,
          patientName: patient.fullName,
          diaryEntryId: entryId,
        },
      }),
    ),
  );
};

export const patientCareDiaryService = {
  async createEntry(patientId: string, input: CreatePatientCareDiaryInput) {
    const entry = await prisma.patientCareDiaryEntry.create({
      data: {
        patientId,
        title: input.title.trim(),
        note: input.note.trim(),
        mood: normalizeOptionalText(input.mood) ?? null,
        symptoms: normalizeOptionalText(input.symptoms) ?? null,
        entryDate: input.entryDate || new Date(),
      },
      select: diarySelect,
    });

    await notifyAssignedDoctors(patientId, entry.id);

    return { entry };
  },

  async listEntries(patientId: string) {
    const entries = await prisma.patientCareDiaryEntry.findMany({
      where: { patientId },
      select: diarySelect,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });

    return { count: entries.length, entries };
  },

  async getEntry(patientId: string, entryId: string) {
    const entry = await findPatientEntry(patientId, entryId);
    return { entry };
  },

  async updateEntry(patientId: string, entryId: string, input: UpdatePatientCareDiaryInput) {
    await findPatientEntry(patientId, entryId);

    const entry = await prisma.patientCareDiaryEntry.update({
      where: { id: entryId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.note !== undefined ? { note: input.note.trim() } : {}),
        ...(input.mood !== undefined ? { mood: normalizeOptionalText(input.mood) } : {}),
        ...(input.symptoms !== undefined ? { symptoms: normalizeOptionalText(input.symptoms) } : {}),
        ...(input.entryDate !== undefined ? { entryDate: input.entryDate } : {}),
      },
      select: diarySelect,
    });

    return { entry };
  },

  async deleteEntry(patientId: string, entryId: string) {
    await findPatientEntry(patientId, entryId);
    await prisma.patientCareDiaryEntry.delete({ where: { id: entryId } });
    return { message: "Care diary entry deleted" };
  },
};
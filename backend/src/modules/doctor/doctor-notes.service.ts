import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  CreateDoctorNoteInput,
  CreateDoctorNoteResponse,
  DoctorNoteResponse,
  DoctorNotesResponse,
} from "./doctor-notes.types.js";

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: {
      id: doctorId,
    },
    select: {
      id: true,
      role: true,
      accountStatus: true,
      isEmailVerified: true,
    },
  });

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  if (doctor.role !== "DOCTOR") {
    throw new AppError("Only doctors can access this resource", 403);
  }

  if (!doctor.isEmailVerified) {
    throw new AppError("Please verify your email first", 403);
  }

  if (doctor.accountStatus !== "ACTIVE" && doctor.accountStatus !== "APPROVED") {
    throw new AppError("Doctor account is not approved yet", 403);
  }

  return doctor;
};

const ensureAssignedPatient = async (doctorId: string, patientId: string) => {
  await ensureApprovedDoctor(doctorId);

  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: {
      doctorId,
      patientId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
    throw new AppError("You are not assigned to this patient", 403);
  }

  return assignment;
};

const formatNote = (note: {
  id: string;
  patientId: string;
  doctorId: string | null;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}): DoctorNoteResponse => {
  return {
    id: note.id,
    patientId: note.patientId,
    doctorId: note.doctorId,
    note: note.note,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

export const doctorNotesService = {
  async listNotes(
    doctorId: string,
    patientId: string
  ): Promise<DoctorNotesResponse> {
    await ensureAssignedPatient(doctorId, patientId);

    const notes = await prisma.patientDoctorNote.findMany({
      where: {
        patientId,
        doctorId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      notes: notes.map(formatNote),
    };
  },

  async createNote(
    doctorId: string,
    patientId: string,
    input: CreateDoctorNoteInput
  ): Promise<CreateDoctorNoteResponse> {
    await ensureAssignedPatient(doctorId, patientId);

    const note = await prisma.patientDoctorNote.create({
      data: {
        patientId,
        doctorId,
        note: input.note.trim(),
      },
    });

    return {
      note: formatNote(note),
    };
  },
};
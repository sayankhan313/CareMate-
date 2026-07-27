import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { jitsiService } from "../patient/jitsi.service.js";

import type {
  DoctorConsultationActionInput,
  DoctorConsultationActionResponse,
  DoctorConsultationDetailResponse,
  DoctorConsultationResponse,
  DoctorConsultationsResponse,
  DoctorJoinConfigResponse,
} from "./doctor-consultations.types.js";
import type { DoctorConsultationsQueryInput } from "./doctor-consultations.validation.js";

const consultationInclude = {
  patient: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  doctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: {
      id: doctorId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
      isEmailVerified: true,
    },
  });

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  if (doctor.role !== "DOCTOR") {
    throw new AppError(
      "Only doctors can access this resource",
      403
    );
  }

  if (!doctor.isEmailVerified) {
    throw new AppError(
      "Please verify your email first",
      403
    );
  }

  if (
    doctor.accountStatus !== "ACTIVE" &&
    doctor.accountStatus !== "APPROVED"
  ) {
    throw new AppError(
      "Doctor account is not approved yet",
      403
    );
  }

  return doctor;
};

const ensurePatientAssignment = async (
  doctorId: string,
  patientId: string
) => {
  const assignment =
    await prisma.patientDoctorAssignment.findFirst({
      where: {
        doctorId,
        patientId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        assignmentType: true,
      },
    });

  if (!assignment) {
    throw new AppError(
      "You are not assigned to this patient",
      403
    );
  }

  return assignment;
};

const canJoinConsultation = (status: string) => {
  return (
    status === "ACCEPTED" ||
    status === "IN_PROGRESS"
  );
};

const formatConsultation = (
  consultation: any
): DoctorConsultationResponse => {
  return {
    id: consultation.id,
    patientId: consultation.patientId,
    doctorId: consultation.doctorId,
    safetyAlertId: consultation.safetyAlertId,
    type: consultation.type,
    status: consultation.status,
    reason: consultation.reason,
    preferredAt: consultation.preferredAt,
    notes: consultation.notes,
    doctorName:
      consultation.doctor?.fullName ||
      consultation.doctorName ||
      null,
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,
    patient: consultation.patient
      ? {
        id: consultation.patient.id,
        fullName: consultation.patient.fullName,
        email: consultation.patient.email,
      }
      : null,
    canJoinCall: canJoinConsultation(
      consultation.status
    ),
  };
};

const buildDoctorMeeting = (
  consultation: any,
  doctor: {
    id: string;
    fullName: string;
    email: string;
  }
) => {
  return jitsiService.createMeetingConfig({
    roomName: consultation.jaasRoomName,
    user: {
      id: doctor.id,
      name: doctor.fullName,
      email: doctor.email,
      role: "DOCTOR",
      moderator: true,
    },
  });
};

const getConsultationForDoctor = async (
  doctorId: string,
  consultationId: string
) => {
  await ensureApprovedDoctor(doctorId);

  const consultation =
    await prisma.consultation.findFirst({
      where: {
        id: consultationId,
        doctorId,
      },
      include: consultationInclude,
    });

  if (!consultation) {
    throw new AppError(
      "Consultation not found",
      404
    );
  }

  await ensurePatientAssignment(
    doctorId,
    consultation.patientId
  );

  return consultation;
};

const getCleanNotes = (
  input: DoctorConsultationActionInput
) => {
  const notes = input.notes?.trim();

  if (!notes) {
    return undefined;
  }

  return notes;
};

export const doctorConsultationsService = {
  async listConsultations(
    doctorId: string,
    query: DoctorConsultationsQueryInput
  ): Promise<DoctorConsultationsResponse> {
    await ensureApprovedDoctor(doctorId);

    const consultations =
      await prisma.consultation.findMany({
        where: {
          doctorId,
          ...(query.status !== "ALL"
            ? {
              status: query.status,
            }
            : {}),
          ...(query.type !== "ALL"
            ? {
              type: query.type,
            }
            : {}),
        },
        include: consultationInclude,
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      });

    return {
      consultations:
        consultations.map(formatConsultation),
    };
  },

  async getConsultationDetail(
    doctorId: string,
    consultationId: string
  ): Promise<DoctorConsultationDetailResponse> {
    const consultation =
      await getConsultationForDoctor(
        doctorId,
        consultationId
      );

    return {
      consultation:
        formatConsultation(consultation),
    };
  },

  async acceptConsultation(
    doctorId: string,
    consultationId: string,
    input: DoctorConsultationActionInput
  ): Promise<DoctorConsultationActionResponse> {
    const doctor =
      await ensureApprovedDoctor(doctorId);

    const consultation =
      await getConsultationForDoctor(
        doctorId,
        consultationId
      );

    if (consultation.status !== "PENDING") {
      throw new AppError(
        "Only pending consultations can be accepted",
        400
      );
    }

    const cleanedNotes =
      getCleanNotes(input);

    const updatedConsultation =
      await prisma.consultation.update({
        where: {
          id: consultation.id,
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          doctorId: doctor.id,
          doctorName: doctor.fullName,
          ...(cleanedNotes
            ? {
              notes: cleanedNotes,
            }
            : {}),
        },
        include: consultationInclude,
      });

    return {
      consultation: formatConsultation(
        updatedConsultation
      ),
    };
  },

  async rejectConsultation(
    doctorId: string,
    consultationId: string,
    input: DoctorConsultationActionInput
  ): Promise<DoctorConsultationActionResponse> {
    const doctor =
      await ensureApprovedDoctor(doctorId);

    const consultation =
      await getConsultationForDoctor(
        doctorId,
        consultationId
      );

    if (
      consultation.status !== "PENDING" &&
      consultation.status !== "ACCEPTED"
    ) {
      throw new AppError(
        "Only pending or accepted consultations can be rejected",
        400
      );
    }

    const cleanedNotes =
      getCleanNotes(input);

    const updatedConsultation =
      await prisma.consultation.update({
        where: {
          id: consultation.id,
        },
        data: {
          status: "REJECTED",
          doctorId: doctor.id,
          doctorName: doctor.fullName,
          rejectedAt: new Date(),
          rejectionNote:
            cleanedNotes || null,
          ...(cleanedNotes
            ? {
              notes: cleanedNotes,
            }
            : {}),
        },
        include: consultationInclude,
      });

    return {
      consultation: formatConsultation(
        updatedConsultation
      ),
    };
  },

  async completeConsultation(
    doctorId: string,
    consultationId: string,
    input: DoctorConsultationActionInput
  ): Promise<DoctorConsultationActionResponse> {
    const consultation =
      await getConsultationForDoctor(
        doctorId,
        consultationId
      );

    if (
      consultation.status !== "ACCEPTED" &&
      consultation.status !== "IN_PROGRESS" &&
      consultation.status !== "COMPLETED"
    ) {
      throw new AppError(
        "Only accepted or in-progress consultations can be completed",
        400
      );
    }

    const cleanedNotes =
      getCleanNotes(input);

    const completedAt =
      consultation.completedAt ||
      new Date();

    const updatedConsultation =
      await prisma.$transaction(
        async (transaction) => {
          const completedConsultation =
            consultation.status === "COMPLETED"
              ? consultation
              : await transaction.consultation.update({
                where: {
                  id: consultation.id,
                },
                data: {
                  status: "COMPLETED",
                  completedAt,
                  ...(cleanedNotes
                    ? {
                      notes: cleanedNotes,
                    }
                    : {}),
                },
                include: consultationInclude,
              });

          if (
            consultation.type === "EMERGENCY" &&
            consultation.safetyAlertId
          ) {
            await transaction.safetyAlert.updateMany({
              where: {
                id: consultation.safetyAlertId,
                status: {
                  in: [
                    "ACTIVE",
                    "ESCALATED",
                  ],
                },
              },
              data: {
                status: "RESOLVED",
                resolvedAt: completedAt,
              },
            });
          }

          return completedConsultation;
        }
      );

    return {
      consultation: formatConsultation(
        updatedConsultation
      ),
    };
  },

  async getDoctorJoinConfig(
    doctorId: string,
    consultationId: string
  ): Promise<DoctorJoinConfigResponse> {
    const doctor =
      await ensureApprovedDoctor(doctorId);

    const consultation =
      await getConsultationForDoctor(
        doctorId,
        consultationId
      );

    if (consultation.status === "PENDING") {
      throw new AppError(
        "Accept this consultation before joining the call",
        400
      );
    }

    if (consultation.status === "REJECTED") {
      throw new AppError(
        "Rejected consultation cannot be joined",
        400
      );
    }

    if (consultation.status === "CANCELLED") {
      throw new AppError(
        "Cancelled consultation cannot be joined",
        400
      );
    }

    if (consultation.status === "COMPLETED") {
      throw new AppError(
        "Completed consultation cannot be joined",
        400
      );
    }

    const updatedConsultation =
      consultation.status === "ACCEPTED"
        ? await prisma.consultation.update({
          where: {
            id: consultation.id,
          },
          data: {
            status: "IN_PROGRESS",
            startedAt:
              consultation.startedAt ||
              new Date(),
          },
          include: consultationInclude,
        })
        : consultation;

    return {
      consultation: formatConsultation(
        updatedConsultation
      ),
      doctorMeeting: buildDoctorMeeting(
        updatedConsultation,
        doctor
      ),
    };
  },
};
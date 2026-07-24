import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import type {
  DoctorMedicineReviewActionResponse,
  DoctorMedicineReviewDetailResponse,
  DoctorMedicineReviewResponse,
  DoctorMedicineReviewsResponse,
} from "./doctor-medicine-reviews.types.js";
import type {
  ApproveMedicineReviewInput,
  DoctorMedicineReviewsQueryInput,
  RejectMedicineReviewInput,
} from "./doctor-medicine-reviews.validation.js";

const reviewInclude = {
  medicine: {
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
  reviewedByDoctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

const ensureApprovedDoctor = async (
  doctorId: string
) => {
  const doctor =
    await prisma.user.findUnique({
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
    throw new AppError(
      "Doctor not found",
      404
    );
  }

  if (doctor.role !== "DOCTOR") {
    throw new AppError(
      "Only doctors can access medicine reviews",
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

const getAssignedPatientIds = async (
  doctorId: string
) => {
  const assignments =
    await prisma.patientDoctorAssignment.findMany({
      where: {
        doctorId,
        status: "ACTIVE",
      },
      select: {
        patientId: true,
      },
    });

  return assignments.map(
    (assignment) =>
      assignment.patientId
  );
};

const ensureActiveAssignment = async (
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
      },
    });

  if (!assignment) {
    throw new AppError(
      "You are no longer assigned to this patient",
      403
    );
  }

  return assignment;
};

const formatReview = (
  reminder: any
): DoctorMedicineReviewResponse => {
  return {
    id: reminder.id,
    medicineId:
      reminder.medicineId,
    patientId:
      reminder.medicine.patient.id,
    reviewDoctorId:
      reminder.reviewDoctorId,
    reviewedByDoctorId:
      reminder.reviewedByDoctorId,
    frequency: reminder.frequency,
    customFrequency:
      reminder.customFrequency,
    timeOfDay: reminder.timeOfDay,
    startDate: reminder.startDate,
    endDate: reminder.endDate,
    reviewStatus:
      reminder.reviewStatus,
    reviewedAt: reminder.reviewedAt,
    reviewNote: reminder.reviewNote,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
    patient: {
      id: reminder.medicine.patient.id,
      fullName:
        reminder.medicine.patient
          .fullName,
      email:
        reminder.medicine.patient.email,
    },
    medicine: {
      id: reminder.medicine.id,
      name: reminder.medicine.name,
      dose: reminder.medicine.dose,
      instructions:
        reminder.medicine.instructions,
      source: reminder.medicine.source,
    },
    reviewedByDoctor:
      reminder.reviewedByDoctor ||
      null,
    canApprove:
      reminder.reviewStatus ===
      "PENDING",
    canReject:
      reminder.reviewStatus ===
      "PENDING",
  };
};

const getReviewForDoctor = async (
  doctorId: string,
  reminderId: string
) => {
  await ensureApprovedDoctor(doctorId);

  const reminder =
    await prisma.medicineReminder.findFirst({
      where: {
        id: reminderId,
        reviewDoctorId: doctorId,
        sendToDoctorForReview: true,
        isActive: true,
        medicine: {
          isActive: true,
        },
      },
      include: reviewInclude,
    });

  if (!reminder) {
    throw new AppError(
      "Medicine review not found",
      404
    );
  }

  await ensureActiveAssignment(
    doctorId,
    reminder.medicine.patient.id
  );

  return reminder;
};

export const doctorMedicineReviewsService =
  {
    async listReviews(
      doctorId: string,
      query: DoctorMedicineReviewsQueryInput
    ): Promise<DoctorMedicineReviewsResponse> {
      await ensureApprovedDoctor(
        doctorId
      );

      const assignedPatientIds =
        await getAssignedPatientIds(
          doctorId
        );

      if (
        assignedPatientIds.length === 0
      ) {
        return {
          summary: {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
          },
          reviews: [],
        };
      }

      const baseWhere = {
        reviewDoctorId: doctorId,
        sendToDoctorForReview: true,
        isActive: true,
        medicine: {
          patientId: {
            in: assignedPatientIds,
          },
          isActive: true,
        },
      } as const;

      const [
        reviews,
        total,
        pending,
        approved,
        rejected,
      ] = await Promise.all([
        prisma.medicineReminder.findMany({
          where: {
            ...baseWhere,
            ...(query.status !== "ALL"
              ? {
                  reviewStatus:
                    query.status,
                }
              : {}),
          },
          include: reviewInclude,
          orderBy: {
            updatedAt: "desc",
          },
          take: 100,
        }),

        prisma.medicineReminder.count({
          where: baseWhere,
        }),

        prisma.medicineReminder.count({
          where: {
            ...baseWhere,
            reviewStatus: "PENDING",
          },
        }),

        prisma.medicineReminder.count({
          where: {
            ...baseWhere,
            reviewStatus: "APPROVED",
          },
        }),

        prisma.medicineReminder.count({
          where: {
            ...baseWhere,
            reviewStatus: "REJECTED",
          },
        }),
      ]);

      return {
        summary: {
          total,
          pending,
          approved,
          rejected,
        },
        reviews:
          reviews.map(formatReview),
      };
    },

    async getReviewDetail(
      doctorId: string,
      reminderId: string
    ): Promise<DoctorMedicineReviewDetailResponse> {
      const reminder =
        await getReviewForDoctor(
          doctorId,
          reminderId
        );

      return {
        review:
          formatReview(reminder),
      };
    },

    async approveReview(
      doctorId: string,
      reminderId: string,
      input: ApproveMedicineReviewInput
    ): Promise<DoctorMedicineReviewActionResponse> {
      const doctor =
        await ensureApprovedDoctor(
          doctorId
        );

      const reminder =
        await getReviewForDoctor(
          doctorId,
          reminderId
        );

      if (
        reminder.reviewStatus !==
        "PENDING"
      ) {
        throw new AppError(
          "Only pending medicine reviews can be approved",
          400
        );
      }

      const updatedReminder =
        await prisma.medicineReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            reviewStatus: "APPROVED",
            reviewedByDoctorId:
              doctor.id,
            reviewedAt: new Date(),
            reviewNote:
              input.note?.trim() ||
              null,
          },
          include: reviewInclude,
        });

      return {
        review:
          formatReview(
            updatedReminder
          ),
      };
    },

    async rejectReview(
      doctorId: string,
      reminderId: string,
      input: RejectMedicineReviewInput
    ): Promise<DoctorMedicineReviewActionResponse> {
      const doctor =
        await ensureApprovedDoctor(
          doctorId
        );

      const reminder =
        await getReviewForDoctor(
          doctorId,
          reminderId
        );

      if (
        reminder.reviewStatus !==
        "PENDING"
      ) {
        throw new AppError(
          "Only pending medicine reviews can be rejected",
          400
        );
      }

      const updatedReminder =
        await prisma.medicineReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            reviewStatus: "REJECTED",
            reviewedByDoctorId:
              doctor.id,
            reviewedAt: new Date(),
            reviewNote:
              input.note.trim(),
          },
          include: reviewInclude,
        });

      return {
        review:
          formatReview(
            updatedReminder
          ),
      };
    },
  };
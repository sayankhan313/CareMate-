import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import type {
  DoctorAlertDetailResponse,
  DoctorAlertsResponse,
  DoctorSafetyAlertResponse,
  ResolveDoctorAlertResponse,
} from "./doctor-alerts.types.js";
import type { DoctorAlertsQueryInput } from "./doctor-alerts.validation.js";

const alertInclude = {
  patient: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  vitalReading: true,
  consultation: {
    select: {
      id: true,
      type: true,
      status: true,
      reason: true,
      acceptedAt: true,
      rejectedAt: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true,
      createdAt: true,
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

const getAssignedPatientIds = async (doctorId: string) => {
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
    (assignment) => assignment.patientId
  );
};

const ensureAssignedPatient = async (
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
      "You are not assigned to this patient",
      403
    );
  }

  return assignment;
};

const isTerminalConsultationStatus = (
  status?: string | null
) => {
  return (
    status === "COMPLETED" ||
    status === "REJECTED" ||
    status === "CANCELLED"
  );
};

const formatAlert = (
  alert: any,
  viewingDoctorId: string
): DoctorSafetyAlertResponse => {
  const consultation = alert.consultation || null;
  const isResponsibleDoctor =
    alert.doctorId === viewingDoctorId;

  return {
    id: alert.id,
    patientId: alert.patientId,
    doctorId: alert.doctorId,
    vitalReadingId: alert.vitalReadingId,
    status: alert.status,
    reason: alert.reason,
    timerEndsAt: alert.timerEndsAt,
    cancelledAt: alert.cancelledAt,
    escalatedAt: alert.escalatedAt,
    resolvedAt: alert.resolvedAt,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,

    patient: alert.patient
      ? {
          id: alert.patient.id,
          fullName: alert.patient.fullName,
          email: alert.patient.email,
        }
      : null,

    vitalReading: alert.vitalReading
      ? {
          id: alert.vitalReading.id,
          heartRate: alert.vitalReading.heartRate,
          spo2: alert.vitalReading.spo2,
          bpSystolic: alert.vitalReading.bpSystolic,
          bpDiastolic: alert.vitalReading.bpDiastolic,
          glucose: alert.vitalReading.glucose,
          temperature: alert.vitalReading.temperature,
          status: alert.vitalReading.status,
          source: alert.vitalReading.source,
          deviceSource: alert.vitalReading.deviceSource,
          recordedAt: alert.vitalReading.recordedAt,
        }
      : null,

    consultation: consultation
      ? {
          id: consultation.id,
          type: consultation.type,
          status: consultation.status,
          reason: consultation.reason,
          acceptedAt: consultation.acceptedAt,
          rejectedAt: consultation.rejectedAt,
          startedAt: consultation.startedAt,
          completedAt: consultation.completedAt,
          cancelledAt: consultation.cancelledAt,
          createdAt: consultation.createdAt,
        }
      : null,

    canAcceptConsultation:
      isResponsibleDoctor &&
      alert.status === "ESCALATED" &&
      consultation?.status === "PENDING",

    canJoinCall:
      isResponsibleDoctor &&
      (
        consultation?.status === "ACCEPTED" ||
        consultation?.status === "IN_PROGRESS"
      ),

    canResolveAlert:
      isResponsibleDoctor &&
      alert.status === "ESCALATED" &&
      (
        !consultation ||
        isTerminalConsultationStatus(
          consultation.status
        )
      ),
  };
};

const getAlertForDoctor = async (
  doctorId: string,
  alertId: string
) => {
  await ensureApprovedDoctor(doctorId);

  const alert = await prisma.safetyAlert.findFirst({
    where: {
      id: alertId,
    },
    include: alertInclude,
  });

  if (!alert) {
    throw new AppError(
      "Safety alert not found",
      404
    );
  }

  await ensureAssignedPatient(
    doctorId,
    alert.patientId
  );

  return alert;
};

export const doctorAlertsService = {
  async listAlerts(
    doctorId: string,
    query: DoctorAlertsQueryInput
  ): Promise<DoctorAlertsResponse> {
    await ensureApprovedDoctor(doctorId);

    const assignedPatientIds =
      await getAssignedPatientIds(doctorId);

    if (assignedPatientIds.length === 0) {
      return {
        alerts: [],
      };
    }

    const alerts =
      await prisma.safetyAlert.findMany({
        where: {
          patientId: {
            in: assignedPatientIds,
          },

          ...(query.status !== "ALL"
            ? {
                status: query.status,
              }
            : {}),
        },

        include: alertInclude,

        orderBy: {
          createdAt: "desc",
        },

        take: 100,
      });

    return {
      alerts: alerts.map((alert) =>
        formatAlert(alert, doctorId)
      ),
    };
  },

  async getAlertDetail(
    doctorId: string,
    alertId: string
  ): Promise<DoctorAlertDetailResponse> {
    const alert = await getAlertForDoctor(
      doctorId,
      alertId
    );

    return {
      alert: formatAlert(
        alert,
        doctorId
      ),
    };
  },

  async resolveAlert(
    doctorId: string,
    alertId: string
  ): Promise<ResolveDoctorAlertResponse> {
    const alert = await getAlertForDoctor(
      doctorId,
      alertId
    );

    if (alert.doctorId !== doctorId) {
      throw new AppError(
        "Only the doctor currently responsible for this Safety Response can resolve the alert.",
        403
      );
    }

    if (alert.status === "RESOLVED") {
      return {
        alert: formatAlert(
          alert,
          doctorId
        ),
      };
    }

    if (alert.status === "ACTIVE") {
      throw new AppError(
        "Active safety alerts cannot be resolved before escalation.",
        400
      );
    }

    if (alert.status === "CANCELLED") {
      throw new AppError(
        "Cancelled safety alerts cannot be resolved.",
        400
      );
    }

    if (
      alert.consultation &&
      !isTerminalConsultationStatus(
        alert.consultation.status
      )
    ) {
      throw new AppError(
        "Complete, reject or cancel the linked consultation before resolving this alert.",
        400
      );
    }

    const updatedAlert =
      await prisma.safetyAlert.update({
        where: {
          id: alert.id,
        },

        data: {
          status: "RESOLVED",
          resolvedAt:
            alert.resolvedAt ||
            new Date(),
        },

        include: alertInclude,
      });

    return {
      alert: formatAlert(
        updatedAlert,
        doctorId
      ),
    };
  },
};
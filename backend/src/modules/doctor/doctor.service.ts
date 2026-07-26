import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const formatDateOfBirth = (value?: Date | null) => {
  if (!value) {
    return null;
  }

  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = value.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const formatGender = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (value === "MALE") {
    return "Male";
  }

  if (value === "FEMALE") {
    return "Female";
  }

  if (value === "OTHER") {
    return "Other";
  }

  if (value === "PREFER_NOT_TO_SAY") {
    return "Prefer not to say";
  }

  return value;
};

const startOfToday = () => {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
};

const endOfToday = () => {
  const date = new Date();

  date.setHours(23, 59, 59, 999);

  return date;
};

const formatPatient = (assignment: any) => {
  const patient = assignment.patient;
  const latestVital = patient.vitalReadings[0] || null;
  const activeAlert = patient.patientSafetyAlerts[0] || null;

  return {
    assignmentId: assignment.id,
    assignedAt: assignment.createdAt,

    patient: {
      id: patient.id,
      fullName: patient.fullName,
      email: patient.email,
      phoneNumber: patient.patientProfile?.phoneNumber || null,
      dateOfBirth: formatDateOfBirth(
        patient.patientProfile?.dateOfBirth
      ),
      gender: formatGender(patient.patientProfile?.gender),
      medicalConditions:
        patient.patientProfile?.medicalConditions || null,
      emergencyContact:
        patient.patientProfile?.emergencyContact || null,
    },

    latestVital: latestVital
      ? {
          id: latestVital.id,
          heartRate: latestVital.heartRate,
          spo2: latestVital.spo2,
          bpSystolic: latestVital.bpSystolic,
          bpDiastolic: latestVital.bpDiastolic,
          glucose: latestVital.glucose,
          temperature: latestVital.temperature,
          status: latestVital.status,
          source: latestVital.source,
          deviceSource: latestVital.deviceSource,
          recordedAt: latestVital.recordedAt,
        }
      : null,

    activeMedicineCount: patient.medicines.length,

    activeAlert: activeAlert
      ? {
          id: activeAlert.id,
          status: activeAlert.status,
          reason: activeAlert.reason,
          timerEndsAt: activeAlert.timerEndsAt,
          createdAt: activeAlert.createdAt,
        }
      : null,
  };
};

const formatVitalSummary = (vitalReading: any) => {
  if (!vitalReading) {
    return null;
  }

  if (
    vitalReading.spo2 !== null &&
    vitalReading.spo2 !== undefined
  ) {
    return {
      label: "SpO2",
      value: `${vitalReading.spo2}%`,
      status: vitalReading.status,
    };
  }

  if (
    vitalReading.heartRate !== null &&
    vitalReading.heartRate !== undefined
  ) {
    return {
      label: "Heart rate",
      value: `${vitalReading.heartRate} bpm`,
      status: vitalReading.status,
    };
  }

  if (
    vitalReading.bpSystolic !== null &&
    vitalReading.bpSystolic !== undefined &&
    vitalReading.bpDiastolic !== null &&
    vitalReading.bpDiastolic !== undefined
  ) {
    return {
      label: "Blood pressure",
      value: `${vitalReading.bpSystolic}/${vitalReading.bpDiastolic}`,
      status: vitalReading.status,
    };
  }

  if (
    vitalReading.glucose !== null &&
    vitalReading.glucose !== undefined
  ) {
    return {
      label: "Glucose",
      value: `${vitalReading.glucose} mmol/L`,
      status: vitalReading.status,
    };
  }

  if (
    vitalReading.temperature !== null &&
    vitalReading.temperature !== undefined
  ) {
    return {
      label: "Temperature",
      value: `${vitalReading.temperature}°C`,
      status: vitalReading.status,
    };
  }

  return {
    label: "Critical reading",
    value: "Needs review",
    status: vitalReading.status,
  };
};

const formatAlert = (alert: any) => {
  const vitalSummary = formatVitalSummary(alert.vitalReading);

  return {
    id: alert.id,
    patientId: alert.patientId,
    doctorId: alert.doctorId,
    status: alert.status,
    reason: alert.reason,
    timerEndsAt: alert.timerEndsAt,
    escalatedAt: alert.escalatedAt,
    createdAt: alert.createdAt,

    patient: {
      id: alert.patient.id,
      fullName: alert.patient.fullName,
      email: alert.patient.email,
    },

    vitalSummary,

    consultation: alert.consultation
      ? {
          id: alert.consultation.id,
          type: alert.consultation.type,
          status: alert.consultation.status,
          reason: alert.consultation.reason,
          createdAt: alert.consultation.createdAt,
        }
      : null,

    canJoinCall: Boolean(alert.consultation),
  };
};

const formatConsultation = (consultation: any) => {
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
    doctorName: consultation.doctorName,
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,

    patient: {
      id: consultation.patient.id,
      fullName: consultation.patient.fullName,
      email: consultation.patient.email,
    },
  };
};

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

      doctorProfile: {
        select: {
          phoneNumber: true,
          gmcNumber: true,
          specialization: true,
          clinicName: true,
          clinicAddress: true,
          yearsExperience: true,
          bio: true,
        },
      },
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

  return assignments.map((assignment) => assignment.patientId);
};

export const doctorService = {
  async getDashboard(doctorId: string) {
    const doctor = await ensureApprovedDoctor(doctorId);

    const assignedPatientIds =
      await getAssignedPatientIds(doctorId);

    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    const [
      assignedPatientsCount,
      activeAlertsCount,
      todayConsultationsCount,
      pendingMedicineReviewsCount,
      urgentAlerts,
      upcomingConsultations,
      recentAssignments,
    ] = await Promise.all([
      prisma.patientDoctorAssignment.count({
        where: {
          doctorId,
          status: "ACTIVE",
        },
      }),

      assignedPatientIds.length === 0
        ? 0
        : prisma.safetyAlert.count({
            where: {
              patientId: {
                in: assignedPatientIds,
              },

              status: {
                in: ["ACTIVE", "ESCALATED"],
              },
            },
          }),

      assignedPatientIds.length === 0
        ? 0
        : prisma.consultation.count({
            where: {
              patientId: {
                in: assignedPatientIds,
              },

              createdAt: {
                gte: todayStart,
                lte: todayEnd,
              },

              status: {
                notIn: ["CANCELLED", "REJECTED"],
              },
            },
          }),

      assignedPatientIds.length === 0
        ? 0
        : prisma.medicineReviewRequest.count({
            where: {
              doctorId,
              status: "PENDING",

              patientId: {
                in: assignedPatientIds,
              },
            },
          }),

      assignedPatientIds.length === 0
        ? []
        : prisma.safetyAlert.findMany({
            where: {
              patientId: {
                in: assignedPatientIds,
              },

              status: {
                in: ["ACTIVE", "ESCALATED"],
              },
            },

            include: {
              patient: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },

              vitalReading: true,
              consultation: true,
            },

            orderBy: {
              createdAt: "desc",
            },

            take: 3,
          }),

      assignedPatientIds.length === 0
        ? []
        : prisma.consultation.findMany({
            where: {
              patientId: {
                in: assignedPatientIds,
              },

              status: {
                in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
              },
            },

            include: {
              patient: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },

            orderBy: [
              {
                preferredAt: "asc",
              },
              {
                createdAt: "desc",
              },
            ],

            take: 3,
          }),

      prisma.patientDoctorAssignment.findMany({
        where: {
          doctorId,
          status: "ACTIVE",
        },

        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,

              patientProfile: {
                select: {
                  phoneNumber: true,
                  dateOfBirth: true,
                  gender: true,
                  medicalConditions: true,
                  emergencyContact: true,
                },
              },

              vitalReadings: {
                orderBy: {
                  recordedAt: "desc",
                },

                take: 1,
              },

              medicines: {
                where: {
                  isActive: true,
                },

                select: {
                  id: true,
                },
              },

              patientSafetyAlerts: {
                where: {
                  doctorId,

                  status: {
                    in: ["ACTIVE", "ESCALATED"],
                  },
                },

                orderBy: {
                  createdAt: "desc",
                },

                take: 1,

                select: {
                  id: true,
                  status: true,
                  reason: true,
                  timerEndsAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 3,
      }),
    ]);

    return {
      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        email: doctor.email,
        accountStatus: doctor.accountStatus,
        specialization:
          doctor.doctorProfile?.specialization || null,
        clinicName:
          doctor.doctorProfile?.clinicName || null,
      },

      stats: {
        assignedPatients: assignedPatientsCount,
        activeAlerts: activeAlertsCount,
        todayConsultations: todayConsultationsCount,
        pendingMedicineReviews:
          pendingMedicineReviewsCount,
      },

      urgentAlerts: urgentAlerts.map(formatAlert),

      upcomingConsultations:
        upcomingConsultations.map(formatConsultation),

      recentPatients:
        recentAssignments.map(formatPatient),
    };
  },

  async listAssignedPatients(doctorId: string) {
    await ensureApprovedDoctor(doctorId);

    const assignments =
      await prisma.patientDoctorAssignment.findMany({
        where: {
          doctorId,
          status: "ACTIVE",
        },

        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,

              patientProfile: {
                select: {
                  phoneNumber: true,
                  dateOfBirth: true,
                  gender: true,
                  medicalConditions: true,
                  emergencyContact: true,
                },
              },

              vitalReadings: {
                orderBy: {
                  recordedAt: "desc",
                },

                take: 1,
              },

              medicines: {
                where: {
                  isActive: true,
                },

                select: {
                  id: true,
                },
              },

              patientSafetyAlerts: {
                where: {
                  doctorId,

                  status: {
                    in: ["ACTIVE", "ESCALATED"],
                  },
                },

                orderBy: {
                  createdAt: "desc",
                },

                take: 1,

                select: {
                  id: true,
                  status: true,
                  reason: true,
                  timerEndsAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return {
      patients: assignments.map(formatPatient),
    };
  },
};
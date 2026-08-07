import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

type DoctorOperationalStatusValue = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";
type DoctorAvailabilityStatusValue = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";

type AvailabilityInput = {
  date: string;
  status?: DoctorAvailabilityStatusValue;
  startTime?: string | null;
  endTime?: string | null;
  slotDurationMinutes?: number | null;
};

type SaveMonthlyAvailabilityInput = {
  month?: string;
  availabilities?: AvailabilityInput[];
};

type UpdateOperationalStatusInput = {
  status?: DoctorOperationalStatusValue;
  statusFrom?: string | null;
  statusUntil?: string | null;
  statusNote?: string | null;
};

const VALID_OPERATIONAL_STATUSES = new Set<DoctorOperationalStatusValue>(["AVAILABLE", "OUT_OF_OFFICE", "UNAVAILABLE"]);
const VALID_AVAILABILITY_STATUSES = new Set<DoctorAvailabilityStatusValue>(["AVAILABLE", "OUT_OF_OFFICE", "UNAVAILABLE"]);
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatDateOfBirth = (value?: Date | null) => {
  if (!value) return null;
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = value.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatGender = (value?: string | null) => {
  if (!value) return null;
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  if (value === "OTHER") return "Other";
  if (value === "PREFER_NOT_TO_SAY") return "Prefer not to say";
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

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const parseMonthRange = (month: string) => {
  if (!MONTH_PATTERN.test(month)) throw new AppError("Month must use YYYY-MM format", 400);

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
};

const parseAvailabilityDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) throw new AppError("Availability date must use YYYY-MM-DD format", 400);

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(`Invalid availability date: ${value}`, 400);
  }

  return date;
};

const parseStatusDate = (value: string | null | undefined, endOfDayValue = false) => {
  if (!value) return null;

  if (DATE_PATTERN.test(value)) {
    const date = new Date(`${value}${endOfDayValue ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new AppError(`Invalid status date: ${value}`, 400);
    }

    return date;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid operational status date", 400);
  }

  return date;
};

const getEffectiveOperationalStatus = (profile: any): DoctorOperationalStatusValue => {
  const configuredStatus = (profile?.operationalStatus || "AVAILABLE") as DoctorOperationalStatusValue;

  if (configuredStatus === "AVAILABLE") return "AVAILABLE";

  const now = new Date();

  if (profile?.statusFrom && new Date(profile.statusFrom).getTime() > now.getTime()) return "AVAILABLE";
  if (profile?.statusUntil && new Date(profile.statusUntil).getTime() < now.getTime()) return "AVAILABLE";

  return configuredStatus;
};

const formatOperationalStatus = (profile: any) => ({
  configuredStatus: (profile?.operationalStatus || "AVAILABLE") as DoctorOperationalStatusValue,
  effectiveStatus: getEffectiveOperationalStatus(profile),
  statusFrom: profile?.statusFrom || null,
  statusUntil: profile?.statusUntil || null,
  statusNote: profile?.statusNote || null,
});

const formatAvailability = (availability: any) => ({
  id: availability.id,
  doctorId: availability.doctorId,
  date: availability.date instanceof Date ? availability.date.toISOString().slice(0, 10) : String(availability.date).slice(0, 10),
  status: availability.status || "AVAILABLE",
  startTime: availability.startTime || null,
  endTime: availability.endTime || null,
  slotDurationMinutes: availability.slotDurationMinutes ?? null,
  createdAt: availability.createdAt,
  updatedAt: availability.updatedAt,
});

const validateAvailabilityItem = (item: AvailabilityInput, month: string) => {
  if (!item || typeof item !== "object") throw new AppError("Invalid availability entry", 400);
  if (typeof item.date !== "string") throw new AppError("Availability date is required", 400);
  if (!item.date.startsWith(`${month}-`)) throw new AppError(`Availability date ${item.date} does not belong to ${month}`, 400);

  const date = parseAvailabilityDate(item.date);
  const status = item.status || "AVAILABLE";

  if (!VALID_AVAILABILITY_STATUSES.has(status)) {
    throw new AppError(`Invalid availability status for ${item.date}`, 400);
  }

  if (status === "OUT_OF_OFFICE" || status === "UNAVAILABLE") {
    return {
      date,
      status,
      startTime: null,
      endTime: null,
      slotDurationMinutes: null,
    };
  }

  if (typeof item.startTime !== "string" || !TIME_PATTERN.test(item.startTime)) {
    throw new AppError(`Start time is required for available date ${item.date}`, 400);
  }

  if (typeof item.endTime !== "string" || !TIME_PATTERN.test(item.endTime)) {
    throw new AppError(`End time is required for available date ${item.date}`, 400);
  }

  if (item.startTime >= item.endTime) {
    throw new AppError(`End time must be after start time for ${item.date}`, 400);
  }

  const slotDurationMinutes = item.slotDurationMinutes ?? 30;

  if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 15 || slotDurationMinutes > 120) {
    throw new AppError(`Slot duration for ${item.date} must be between 15 and 120 minutes`, 400);
  }

  return {
    date,
    status,
    startTime: item.startTime,
    endTime: item.endTime,
    slotDurationMinutes,
  };
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
      dateOfBirth: formatDateOfBirth(patient.patientProfile?.dateOfBirth),
      gender: formatGender(patient.patientProfile?.gender),
      medicalConditions: patient.patientProfile?.medicalConditions || null,
      emergencyContact: patient.patientProfile?.emergencyContact || null,
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
  if (!vitalReading) return null;

  if (vitalReading.spo2 !== null && vitalReading.spo2 !== undefined) {
    return { label: "SpO2", value: `${vitalReading.spo2}%`, status: vitalReading.status };
  }

  if (vitalReading.heartRate !== null && vitalReading.heartRate !== undefined) {
    return { label: "Heart rate", value: `${vitalReading.heartRate} bpm`, status: vitalReading.status };
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

  if (vitalReading.glucose !== null && vitalReading.glucose !== undefined) {
    return { label: "Glucose", value: `${vitalReading.glucose} mmol/L`, status: vitalReading.status };
  }

  if (vitalReading.temperature !== null && vitalReading.temperature !== undefined) {
    return { label: "Temperature", value: `${vitalReading.temperature}°C`, status: vitalReading.status };
  }

  return {
    label: "Critical reading",
    value: "Needs review",
    status: vitalReading.status,
  };
};

const formatAlert = (alert: any) => ({
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

  vitalSummary: formatVitalSummary(alert.vitalReading),

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
});

const formatConsultation = (consultation: any) => ({
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
});

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },

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
          operationalStatus: true,
          statusFrom: true,
          statusUntil: true,
          statusNote: true,
        },
      },
    },
  });

  if (!doctor) throw new AppError("Doctor not found", 404);
  if (doctor.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);
  if (!doctor.isEmailVerified) throw new AppError("Please verify your email first", 403);
  if (doctor.accountStatus !== "ACTIVE" && doctor.accountStatus !== "APPROVED") throw new AppError("Doctor account is not approved yet", 403);
  if (!doctor.doctorProfile) throw new AppError("Doctor profile not found", 404);

  return doctor;
};

const getAssignedPatientIds = async (doctorId: string) => {
  const assignments = await prisma.patientDoctorAssignment.findMany({
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
    const assignedPatientIds = await getAssignedPatientIds(doctorId);

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
              patientId: { in: assignedPatientIds },
              status: { in: ["ACTIVE", "ESCALATED"] },
            },
          }),

      assignedPatientIds.length === 0
        ? 0
        : prisma.consultation.count({
            where: {
              patientId: { in: assignedPatientIds },
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
        specialization: doctor.doctorProfile?.specialization || null,
        clinicName: doctor.doctorProfile?.clinicName || null,
        operationalStatus: formatOperationalStatus(doctor.doctorProfile),
      },

      stats: {
        assignedPatients: assignedPatientsCount,
        activeAlerts: activeAlertsCount,
        todayConsultations: todayConsultationsCount,
        pendingMedicineReviews: pendingMedicineReviewsCount,
      },

      urgentAlerts: urgentAlerts.map(formatAlert),
      upcomingConsultations: upcomingConsultations.map(formatConsultation),
      recentPatients: recentAssignments.map(formatPatient),
    };
  },

  async listAssignedPatients(doctorId: string) {
    await ensureApprovedDoctor(doctorId);

    const assignments = await prisma.patientDoctorAssignment.findMany({
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

  async getAvailability(doctorId: string, requestedMonth?: string) {
    const doctor = await ensureApprovedDoctor(doctorId);
    const month = requestedMonth || getCurrentMonth();

    const { start, end } = parseMonthRange(month);

    const availabilities = await prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        date: {
          gte: start,
          lt: end,
        },
      },

      orderBy: {
        date: "asc",
      },
    });

    return {
      month,

      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        specialization: doctor.doctorProfile?.specialization || null,
        clinicName: doctor.doctorProfile?.clinicName || null,
      },

      operationalStatus: formatOperationalStatus(doctor.doctorProfile),
      availabilities: availabilities.map(formatAvailability),
    };
  },

  async saveMonthlyAvailability(doctorId: string, input: SaveMonthlyAvailabilityInput) {
    await ensureApprovedDoctor(doctorId);

    const month = typeof input?.month === "string" ? input.month.trim() : "";

    if (!month) {
      throw new AppError("Month is required", 400);
    }

    const { start, end } = parseMonthRange(month);
    const availabilities = input?.availabilities;

    if (!Array.isArray(availabilities)) {
      throw new AppError("Availabilities must be an array", 400);
    }

    const seenDates = new Set<string>();

    const validated = availabilities.map((item) => {
      if (seenDates.has(item.date)) {
        throw new AppError(`Duplicate availability date: ${item.date}`, 400);
      }

      seenDates.add(item.date);

      const value = validateAvailabilityItem(item, month);

      return {
        doctorId,
        date: value.date,
        status: value.status,
        startTime: value.startTime,
        endTime: value.endTime,
        slotDurationMinutes: value.slotDurationMinutes,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({
        where: {
          doctorId,
          date: {
            gte: start,
            lt: end,
          },
        },
      });

      if (validated.length > 0) {
        await tx.doctorAvailability.createMany({
          data: validated,
        });
      }
    });

    const saved = await prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        date: {
          gte: start,
          lt: end,
        },
      },

      orderBy: {
        date: "asc",
      },
    });

    return {
      month,
      availabilityCount: saved.length,
      availabilities: saved.map(formatAvailability),
    };
  },

  async updateOperationalStatus(doctorId: string, input: UpdateOperationalStatusInput) {
    await ensureApprovedDoctor(doctorId);

    const status = input?.status;

    if (!status || !VALID_OPERATIONAL_STATUSES.has(status)) {
      throw new AppError("Status must be AVAILABLE, OUT_OF_OFFICE or UNAVAILABLE", 400);
    }

    if (status === "AVAILABLE") {
      const profile = await prisma.doctorProfile.update({
        where: {
          userId: doctorId,
        },

        data: {
          operationalStatus: "AVAILABLE",
          statusFrom: null,
          statusUntil: null,
          statusNote: null,
        },

        select: {
          operationalStatus: true,
          statusFrom: true,
          statusUntil: true,
          statusNote: true,
        },
      });

      return formatOperationalStatus(profile);
    }

    const statusFrom = parseStatusDate(input.statusFrom, false);
    const statusUntil = parseStatusDate(input.statusUntil, true);

    if (statusFrom && statusUntil && statusUntil.getTime() <= statusFrom.getTime()) {
      throw new AppError("Status end date must be after the start date", 400);
    }

    const statusNote =
      typeof input.statusNote === "string" && input.statusNote.trim()
        ? input.statusNote.trim().slice(0, 300)
        : null;

    const profile = await prisma.doctorProfile.update({
      where: {
        userId: doctorId,
      },

      data: {
        operationalStatus: status,
        statusFrom,
        statusUntil,
        statusNote,
      },

      select: {
        operationalStatus: true,
        statusFrom: true,
        statusUntil: true,
        statusNote: true,
      },
    });

    return formatOperationalStatus(profile);
  },

  async deleteAvailability(doctorId: string, availabilityId: string) {
    await ensureApprovedDoctor(doctorId);

    if (!availabilityId?.trim()) {
      throw new AppError("Availability ID is required", 400);
    }

    const availability = await prisma.doctorAvailability.findFirst({
      where: {
        id: availabilityId,
        doctorId,
      },
    });

    if (!availability) {
      throw new AppError("Availability not found", 404);
    }

    await prisma.doctorAvailability.delete({
      where: {
        id: availability.id,
      },
    });

    return {
      id: availability.id,
      deleted: true,
    };
  },
};
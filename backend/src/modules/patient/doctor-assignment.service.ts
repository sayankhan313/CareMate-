import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

type ListApprovedDoctorsOptions = { specialization?: string; search?: string; limit?: number };
type AssignDoctorOptions = { makePrimary?: boolean };
type NotificationInput = Parameters<typeof notificationService.createAndSend>[0];

const approvedDoctorWhere: any = { role: "DOCTOR", accountStatus: { in: ["ACTIVE", "APPROVED"] }, isEmailVerified: true };
const approvedAssignmentDoctorWhere: any = { role: "DOCTOR", accountStatus: { in: ["ACTIVE", "APPROVED"] }, isEmailVerified: true };

const doctorProfileSelect = {
  phoneNumber: true,
  gmcNumber: true,
  specialization: true,
  clinicName: true,
  clinicAddress: true,
  yearsExperience: true,
  bio: true,
};

const doctorSelect = {
  id: true,
  fullName: true,
  email: true,
  accountStatus: true,
  doctorProfile: { select: doctorProfileSelect },
};

const normalizeOptionalText = (value?: string) => value?.trim() || undefined;

const formatDoctor = (doctor: any, assignment?: any | null) => {
  const profile = doctor.doctorProfile;

  return {
    id: doctor.id,
    fullName: doctor.fullName,
    email: doctor.email,
    phoneNumber: profile?.phoneNumber || null,
    gmcNumber: profile?.gmcNumber || null,
    specialization: profile?.specialization || "General Medicine",
    clinicName: profile?.clinicName || "Clinic not added",
    clinicAddress: profile?.clinicAddress || null,
    yearsExperience: profile?.yearsExperience ?? null,
    bio: profile?.bio || null,
    isAssigned: Boolean(assignment),
    isPrimary: assignment?.assignmentType === "PRIMARY",
    assignmentId: assignment?.id || null,
    assignmentType: assignment?.assignmentType || null,
    assignmentStatus: assignment?.status || null,
    assignedAt: assignment?.createdAt || null,
  };
};

const formatAssignedDoctor = (assignment: any) => ({
  assignmentId: assignment.id,
  assignmentType: assignment.assignmentType,
  status: assignment.status,
  assignedAt: assignment.createdAt,
  updatedAt: assignment.updatedAt,
  doctor: formatDoctor(assignment.doctor, assignment),
});

const getApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, ...approvedDoctorWhere, doctorProfile: { isNot: null } },
    select: doctorSelect,
  });

  if (!doctor || !doctor.doctorProfile) throw new AppError("Doctor not found or doctor account is not approved yet", 404);
  return doctor;
};

const getPatientSummary = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, fullName: true },
  });

  if (!patient) throw new AppError("Patient account not found", 404);
  return patient;
};

const getAssignmentWithDoctor = async (patientId: string, doctorId: string) => {
  return prisma.patientDoctorAssignment.findUnique({
    where: { patientId_doctorId: { patientId, doctorId } },
    include: { doctor: { select: doctorSelect } },
  });
};

const safeSendNotification = async (input: NotificationInput) => {
  try {
    await notificationService.createAndSend(input);
  } catch (error) {
    console.warn(`Unable to send ${input.type} notification:`, error instanceof Error ? error.message : error);
  }
};

const notifyDoctorAssigned = async (
  doctorId: string,
  patient: { id: string; fullName: string },
  assignmentType: "PRIMARY" | "SPECIALIST",
  assignmentId: string
) => {
  const isPrimary = assignmentType === "PRIMARY";

  await safeSendNotification({
    userId: doctorId,
    type: "PATIENT_ASSIGNED",
    title: isPrimary ? "New primary patient" : "New assigned patient",
    body: isPrimary
      ? `${patient.fullName} selected you as their primary doctor.`
      : `${patient.fullName} added you to their CareMate+ care team.`,
    priority: "HIGH",
    entityType: "PATIENT_ASSIGNMENT",
    entityId: assignmentId,
    targetScreen: "DoctorPatients",
    data: {
      assignmentId,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId,
      assignmentType,
      assignmentStatus: "ACTIVE",
      source: "PATIENT_DOCTOR_ASSIGNMENT",
    },
  });
};

const notifyDoctorUnassigned = async (
  doctorId: string,
  patient: { id: string; fullName: string },
  assignmentId: string,
  previousAssignmentType: "PRIMARY" | "SPECIALIST"
) => {
  await safeSendNotification({
    userId: doctorId,
    type: "PATIENT_UNASSIGNED",
    title: "Patient assignment removed",
    body: `${patient.fullName} removed you from their CareMate+ care team.`,
    priority: "NORMAL",
    entityType: "PATIENT_ASSIGNMENT",
    entityId: assignmentId,
    targetScreen: "DoctorPatients",
    data: {
      assignmentId,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId,
      previousAssignmentType,
      assignmentStatus: "INACTIVE",
      source: "PATIENT_DOCTOR_UNASSIGNMENT",
    },
  });
};

const notifyPatientPrimaryChanged = async (
  patient: { id: string; fullName: string },
  doctor: { id: string; fullName: string } | null,
  previousPrimaryDoctorId: string | null
) => {
  await safeSendNotification({
    userId: patient.id,
    type: "PRIMARY_DOCTOR_CHANGED",
    title: doctor ? "Primary doctor updated" : "Primary doctor removed",
    body: doctor
      ? `${doctor.fullName} is now your primary doctor.`
      : "You currently have no primary doctor assigned.",
    priority: "NORMAL",
    entityType: "DOCTOR_ASSIGNMENT",
    entityId: doctor?.id,
    targetScreen: "PatientProfile",
    data: {
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor?.id || null,
      doctorName: doctor?.fullName || null,
      previousPrimaryDoctorId,
      assignmentType: doctor ? "PRIMARY" : null,
      source: "PRIMARY_DOCTOR_CHANGE",
    },
  });
};

const ensureSinglePrimaryDoctor = async (patientId: string) => {
  const activeAssignments = await prisma.patientDoctorAssignment.findMany({
    where: { patientId, status: "ACTIVE", doctor: approvedAssignmentDoctorWhere },
    select: { id: true, doctorId: true, assignmentType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (activeAssignments.length === 0) return null;

  const primaryAssignments = activeAssignments.filter(assignment => assignment.assignmentType === "PRIMARY");
  const selectedPrimary = primaryAssignments[0] || activeAssignments[0];
  const hasInvalidPrimaryState = primaryAssignments.length !== 1 || selectedPrimary.assignmentType !== "PRIMARY";

  if (hasInvalidPrimaryState) {
    await prisma.$transaction(async transaction => {
      await transaction.patientDoctorAssignment.updateMany({
        where: { patientId, status: "ACTIVE", assignmentType: "PRIMARY", id: { not: selectedPrimary.id } },
        data: { assignmentType: "SPECIALIST" },
      });

      await transaction.patientDoctorAssignment.update({
        where: { id: selectedPrimary.id },
        data: { assignmentType: "PRIMARY" },
      });
    });
  }

  return selectedPrimary.doctorId;
};

export const doctorAssignmentService = {
  async listDoctorSpecialties(patientId: string) {
    await ensureSinglePrimaryDoctor(patientId);

    const doctors = await prisma.user.findMany({
      where: { ...approvedDoctorWhere, doctorProfile: { isNot: null } },
      select: { doctorProfile: { select: { specialization: true } } },
    });

    const specialtyCountMap = new Map<string, number>();

    doctors.forEach(doctor => {
      const specialization = doctor.doctorProfile?.specialization?.trim();
      if (!specialization) return;
      specialtyCountMap.set(specialization, (specialtyCountMap.get(specialization) || 0) + 1);
    });

    const specialties = Array.from(specialtyCountMap.entries())
      .map(([name, doctorCount]) => ({ name, doctorCount }))
      .sort((first, second) => first.name.localeCompare(second.name));

    return { specialties };
  },

  async listApprovedDoctors(patientId: string, options: ListApprovedDoctorsOptions = {}) {
    const specialization = normalizeOptionalText(options.specialization);
    const search = normalizeOptionalText(options.search);
    const limit = Math.min(Math.max(options.limit || 30, 1), 50);
    const primaryDoctorId = await ensureSinglePrimaryDoctor(patientId);

    const doctorWhere: any = {
      ...approvedDoctorWhere,
      doctorProfile: specialization
        ? { is: { specialization: { equals: specialization, mode: "insensitive" } } }
        : { isNot: null },
    };

    if (search) {
      doctorWhere.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { doctorProfile: { is: { specialization: { contains: search, mode: "insensitive" } } } },
        { doctorProfile: { is: { clinicName: { contains: search, mode: "insensitive" } } } },
        { doctorProfile: { is: { clinicAddress: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const doctors = await prisma.user.findMany({
      where: doctorWhere,
      select: doctorSelect,
      orderBy: { fullName: "asc" },
      take: limit,
    });

    const doctorIds = doctors.map(doctor => doctor.id);

    const assignments = doctorIds.length === 0
      ? []
      : await prisma.patientDoctorAssignment.findMany({
          where: { patientId, doctorId: { in: doctorIds }, status: "ACTIVE" },
          select: { id: true, doctorId: true, assignmentType: true, status: true, createdAt: true },
        });

    const assignmentMap = new Map(assignments.map(assignment => [assignment.doctorId, assignment]));

    const formattedDoctors = doctors
      .map(doctor => formatDoctor(doctor, assignmentMap.get(doctor.id)))
      .sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) return first.isPrimary ? -1 : 1;
        if (first.isAssigned !== second.isAssigned) return first.isAssigned ? -1 : 1;
        return first.fullName.localeCompare(second.fullName);
      });

    return {
      assignedDoctorId: primaryDoctorId,
      primaryDoctorId,
      assignedDoctorIds: assignments.map(assignment => assignment.doctorId),
      doctors: formattedDoctors,
    };
  },

  async listAssignedDoctors(patientId: string) {
    const primaryDoctorId = await ensureSinglePrimaryDoctor(patientId);

    const assignments = await prisma.patientDoctorAssignment.findMany({
      where: { patientId, status: "ACTIVE", doctor: approvedAssignmentDoctorWhere },
      include: { doctor: { select: doctorSelect } },
      orderBy: { createdAt: "asc" },
    });

    const doctors = assignments.map(formatAssignedDoctor).sort((first, second) => {
      if (first.assignmentType !== second.assignmentType) return first.assignmentType === "PRIMARY" ? -1 : 1;
      return first.doctor.fullName.localeCompare(second.doctor.fullName);
    });

    return { primaryDoctorId, totalAssignedDoctors: doctors.length, doctors };
  },

  async assignDoctor(patientId: string, doctorId: string, options: AssignDoctorOptions = {}) {
    const [doctor, patient] = await Promise.all([getApprovedDoctor(doctorId), getPatientSummary(patientId)]);

    const [existingAssignment, activeAssignmentCount, currentPrimaryAssignment] = await Promise.all([
      prisma.patientDoctorAssignment.findUnique({
        where: { patientId_doctorId: { patientId, doctorId } },
        select: { id: true, status: true, assignmentType: true },
      }),
      prisma.patientDoctorAssignment.count({
        where: { patientId, status: "ACTIVE", doctor: approvedAssignmentDoctorWhere },
      }),
      prisma.patientDoctorAssignment.findFirst({
        where: { patientId, status: "ACTIVE", assignmentType: "PRIMARY", doctor: approvedAssignmentDoctorWhere },
        select: { doctorId: true },
      }),
    ]);

    const wasAlreadyActive = existingAssignment?.status === "ACTIVE";
    const shouldBecomePrimary =
      options.makePrimary === true ||
      activeAssignmentCount === 0 ||
      (wasAlreadyActive && existingAssignment.assignmentType === "PRIMARY");

    const previousPrimaryDoctorId = currentPrimaryAssignment?.doctorId || null;
    const primaryDoctorChanged = shouldBecomePrimary && previousPrimaryDoctorId !== doctorId;

    await prisma.$transaction(async transaction => {
      if (shouldBecomePrimary) {
        await transaction.patientDoctorAssignment.updateMany({
          where: { patientId, status: "ACTIVE", assignmentType: "PRIMARY", doctorId: { not: doctorId } },
          data: { assignmentType: "SPECIALIST" },
        });
      }

      await transaction.patientDoctorAssignment.upsert({
        where: { patientId_doctorId: { patientId, doctorId } },
        update: { status: "ACTIVE", assignmentType: shouldBecomePrimary ? "PRIMARY" : "SPECIALIST" },
        create: { patientId, doctorId, status: "ACTIVE", assignmentType: shouldBecomePrimary ? "PRIMARY" : "SPECIALIST" },
      });
    });

    const primaryDoctorId = await ensureSinglePrimaryDoctor(patientId);
    const assignment = await getAssignmentWithDoctor(patientId, doctorId);

    if (!assignment) throw new AppError("Doctor assignment could not be created", 500);

    if (!wasAlreadyActive || primaryDoctorChanged) {
      await notifyDoctorAssigned(
        doctorId,
        patient,
        assignment.assignmentType as "PRIMARY" | "SPECIALIST",
        assignment.id
      );
    }

    if (primaryDoctorChanged && previousPrimaryDoctorId) {
      await notifyPatientPrimaryChanged(patient, { id: doctor.id, fullName: doctor.fullName }, previousPrimaryDoctorId);
    }

    return {
      doctor: formatDoctor(doctor, assignment),
      assignment: {
        id: assignment.id,
        assignmentType: assignment.assignmentType,
        status: assignment.status,
        assignedAt: assignment.createdAt,
      },
      primaryDoctorId,
    };
  },

  async setPrimaryDoctor(patientId: string, doctorId: string) {
    const [doctor, patient] = await Promise.all([getApprovedDoctor(doctorId), getPatientSummary(patientId)]);

    const [assignment, currentPrimaryAssignment] = await Promise.all([
      prisma.patientDoctorAssignment.findUnique({
        where: { patientId_doctorId: { patientId, doctorId } },
        select: { id: true, status: true, assignmentType: true },
      }),
      prisma.patientDoctorAssignment.findFirst({
        where: { patientId, status: "ACTIVE", assignmentType: "PRIMARY" },
        select: { doctorId: true },
      }),
    ]);

    if (!assignment || assignment.status !== "ACTIVE") {
      throw new AppError("This doctor must be assigned before setting them as primary", 404);
    }

    if (assignment.assignmentType === "PRIMARY") {
      const existingAssignment = await getAssignmentWithDoctor(patientId, doctorId);
      if (!existingAssignment) throw new AppError("Primary doctor could not be fetched", 500);

      return {
        primaryDoctorId: doctorId,
        doctor: formatDoctor(existingAssignment.doctor, existingAssignment),
      };
    }

    const previousPrimaryDoctorId = currentPrimaryAssignment?.doctorId || null;

    await prisma.$transaction(async transaction => {
      await transaction.patientDoctorAssignment.updateMany({
        where: { patientId, status: "ACTIVE", assignmentType: "PRIMARY" },
        data: { assignmentType: "SPECIALIST" },
      });

      await transaction.patientDoctorAssignment.update({
        where: { id: assignment.id },
        data: { assignmentType: "PRIMARY" },
      });
    });

    const updatedAssignment = await getAssignmentWithDoctor(patientId, doctorId);
    if (!updatedAssignment) throw new AppError("Primary doctor could not be updated", 500);

    await Promise.all([
      notifyDoctorAssigned(doctorId, patient, "PRIMARY", updatedAssignment.id),
      notifyPatientPrimaryChanged(patient, { id: doctor.id, fullName: doctor.fullName }, previousPrimaryDoctorId),
    ]);

    return {
      primaryDoctorId: doctorId,
      doctor: formatDoctor(updatedAssignment.doctor, updatedAssignment),
    };
  },

  async removeDoctor(patientId: string, doctorId: string) {
    const patient = await getPatientSummary(patientId);

    const assignment = await prisma.patientDoctorAssignment.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
      select: { id: true, status: true, assignmentType: true },
    });

    if (!assignment || assignment.status !== "ACTIVE") throw new AppError("Active doctor assignment not found", 404);

    const wasPrimary = assignment.assignmentType === "PRIMARY";

    await prisma.patientDoctorAssignment.update({
      where: { id: assignment.id },
      data: { status: "INACTIVE", assignmentType: "SPECIALIST" },
    });

    const newPrimaryDoctorId = await ensureSinglePrimaryDoctor(patientId);

    await notifyDoctorUnassigned(
      doctorId,
      patient,
      assignment.id,
      assignment.assignmentType as "PRIMARY" | "SPECIALIST"
    );

    if (wasPrimary) {
      const newPrimaryDoctor = newPrimaryDoctorId
        ? await prisma.user.findUnique({ where: { id: newPrimaryDoctorId }, select: { id: true, fullName: true } })
        : null;

      await notifyPatientPrimaryChanged(patient, newPrimaryDoctor, doctorId);

      if (newPrimaryDoctorId && newPrimaryDoctor) {
        const promotedAssignment = await prisma.patientDoctorAssignment.findUnique({
          where: { patientId_doctorId: { patientId, doctorId: newPrimaryDoctorId } },
          select: { id: true },
        });

        if (promotedAssignment) {
          await notifyDoctorAssigned(newPrimaryDoctorId, patient, "PRIMARY", promotedAssignment.id);
        }
      }
    }

    return {
      removedDoctorId: doctorId,
      removedAssignmentType: assignment.assignmentType,
      primaryDoctorId: newPrimaryDoctorId,
    };
  },
};
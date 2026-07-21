import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const approvedDoctorWhere = {
  role: "DOCTOR" as const,
  accountStatus: "ACTIVE" as const,
  isEmailVerified: true,
};

const formatDoctor = (doctor: any, assignedDoctorId?: string | null) => {
  return {
    id: doctor.id,
    fullName: doctor.fullName,
    email: doctor.email,
    specialization: doctor.doctorProfile?.specialization || null,
    clinicName: doctor.doctorProfile?.clinicName || null,
    clinicAddress: doctor.doctorProfile?.clinicAddress || null,
    yearsExperience: doctor.doctorProfile?.yearsExperience || null,
    bio: doctor.doctorProfile?.bio || null,
    isAssigned: assignedDoctorId === doctor.id,
  };
};

export const doctorAssignmentService = {
  async listApprovedDoctors(patientId: string) {
    const [assignment, doctors] = await Promise.all([
      prisma.patientDoctorAssignment.findUnique({
        where: {
          patientId,
        },
        select: {
          doctorId: true,
        },
      }),

      prisma.user.findMany({
        where: approvedDoctorWhere,
        select: {
          id: true,
          fullName: true,
          email: true,
          doctorProfile: {
            select: {
              specialization: true,
              clinicName: true,
              clinicAddress: true,
              yearsExperience: true,
              bio: true,
            },
          },
        },
        orderBy: {
          fullName: "asc",
        },
      }),
    ]);

    return {
      assignedDoctorId: assignment?.doctorId || null,
      doctors: doctors.map((doctor) =>
        formatDoctor(doctor, assignment?.doctorId || null)
      ),
    };
  },

  async assignDoctor(patientId: string, doctorId: string) {
    const doctor = await prisma.user.findFirst({
      where: {
        id: doctorId,
        ...approvedDoctorWhere,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        doctorProfile: {
          select: {
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
      throw new AppError(
        "Doctor not found or doctor account is not approved yet",
        404
      );
    }

    await prisma.patientDoctorAssignment.upsert({
      where: {
        patientId,
      },
      update: {
        doctorId,
        status: "ACTIVE",
      },
      create: {
        patientId,
        doctorId,
        status: "ACTIVE",
      },
    });

    return {
      doctor: formatDoctor(doctor, doctor.id),
    };
  },
};
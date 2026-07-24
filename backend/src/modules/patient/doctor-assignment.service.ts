import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

type ListApprovedDoctorsOptions = {
  specialization?: string;
  search?: string;
  limit?: number;
};

type AssignDoctorOptions = {
  makePrimary?: boolean;
};

const approvedDoctorWhere: any = {
  role: "DOCTOR",
  accountStatus: {
    in: ["ACTIVE", "APPROVED"],
  },
  isEmailVerified: true,
};

const approvedAssignmentDoctorWhere: any = {
  role: "DOCTOR",
  accountStatus: {
    in: ["ACTIVE", "APPROVED"],
  },
  isEmailVerified: true,
};

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
  doctorProfile: {
    select: doctorProfileSelect,
  },
};

const normalizeOptionalText = (value?: string) => {
  const normalizedValue = value?.trim();

  return normalizedValue || undefined;
};

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

const formatAssignedDoctor = (assignment: any) => {
  return {
    assignmentId: assignment.id,
    assignmentType: assignment.assignmentType,
    status: assignment.status,
    assignedAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,

    doctor: formatDoctor(assignment.doctor, assignment),
  };
};

const getApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findFirst({
    where: {
      id: doctorId,
      ...approvedDoctorWhere,
      doctorProfile: {
        isNot: null,
      },
    },
    select: doctorSelect,
  });

  if (!doctor || !doctor.doctorProfile) {
    throw new AppError(
      "Doctor not found or doctor account is not approved yet",
      404
    );
  }

  return doctor;
};

const getAssignmentWithDoctor = async (
  patientId: string,
  doctorId: string
) => {
  return prisma.patientDoctorAssignment.findUnique({
    where: {
      patientId_doctorId: {
        patientId,
        doctorId,
      },
    },
    include: {
      doctor: {
        select: doctorSelect,
      },
    },
  });
};

/**
 * Keeps exactly one approved active doctor as PRIMARY.
 *
 * This also repairs existing assignment rows created before the
 * PRIMARY/SPECIALIST update. Those old rows may still have the
 * default SPECIALIST assignment type.
 */
const ensureSinglePrimaryDoctor = async (patientId: string) => {
  const activeAssignments =
    await prisma.patientDoctorAssignment.findMany({
      where: {
        patientId,
        status: "ACTIVE",

        doctor: approvedAssignmentDoctorWhere,
      },
      select: {
        id: true,
        doctorId: true,
        assignmentType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  if (activeAssignments.length === 0) {
    return null;
  }

  const primaryAssignments = activeAssignments.filter((assignment) => {
    return assignment.assignmentType === "PRIMARY";
  });

  const selectedPrimary =
    primaryAssignments[0] || activeAssignments[0];

  const hasInvalidPrimaryState =
    primaryAssignments.length !== 1 ||
    selectedPrimary.assignmentType !== "PRIMARY";

  if (hasInvalidPrimaryState) {
    await prisma.$transaction(async (transaction) => {
      await transaction.patientDoctorAssignment.updateMany({
        where: {
          patientId,
          status: "ACTIVE",
          assignmentType: "PRIMARY",
          id: {
            not: selectedPrimary.id,
          },
        },
        data: {
          assignmentType: "SPECIALIST",
        },
      });

      await transaction.patientDoctorAssignment.update({
        where: {
          id: selectedPrimary.id,
        },
        data: {
          assignmentType: "PRIMARY",
        },
      });
    });
  }

  return selectedPrimary.doctorId;
};

export const doctorAssignmentService = {
  async listDoctorSpecialties(patientId: string) {
    await ensureSinglePrimaryDoctor(patientId);

    const doctors = await prisma.user.findMany({
      where: {
        ...approvedDoctorWhere,

        doctorProfile: {
          isNot: null,
        },
      },
      select: {
        doctorProfile: {
          select: {
            specialization: true,
          },
        },
      },
    });

    const specialtyCountMap = new Map<string, number>();

    doctors.forEach((doctor) => {
      const specialization =
        doctor.doctorProfile?.specialization?.trim();

      if (!specialization) {
        return;
      }

      const currentCount =
        specialtyCountMap.get(specialization) || 0;

      specialtyCountMap.set(
        specialization,
        currentCount + 1
      );
    });

    const specialties = Array.from(
      specialtyCountMap.entries()
    )
      .map(([name, doctorCount]) => {
        return {
          name,
          doctorCount,
        };
      })
      .sort((first, second) => {
        return first.name.localeCompare(second.name);
      });

    return {
      specialties,
    };
  },

  async listApprovedDoctors(
    patientId: string,
    options: ListApprovedDoctorsOptions = {}
  ) {
    const specialization = normalizeOptionalText(
      options.specialization
    );

    const search = normalizeOptionalText(options.search);

    const limit = Math.min(
      Math.max(options.limit || 30, 1),
      50
    );

    const primaryDoctorId =
      await ensureSinglePrimaryDoctor(patientId);

    const doctorWhere: any = {
      ...approvedDoctorWhere,

      doctorProfile: specialization
        ? {
            is: {
              specialization: {
                equals: specialization,
                mode: "insensitive",
              },
            },
          }
        : {
            isNot: null,
          },
    };

    if (search) {
      doctorWhere.OR = [
        {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          doctorProfile: {
            is: {
              specialization: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          doctorProfile: {
            is: {
              clinicName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          doctorProfile: {
            is: {
              clinicAddress: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const doctors = await prisma.user.findMany({
      where: doctorWhere,
      select: doctorSelect,
      orderBy: {
        fullName: "asc",
      },
      take: limit,
    });

    const doctorIds = doctors.map((doctor) => doctor.id);

    const assignments =
      doctorIds.length === 0
        ? []
        : await prisma.patientDoctorAssignment.findMany({
            where: {
              patientId,
              doctorId: {
                in: doctorIds,
              },
              status: "ACTIVE",
            },
            select: {
              id: true,
              doctorId: true,
              assignmentType: true,
              status: true,
              createdAt: true,
            },
          });

    const assignmentMap = new Map(
      assignments.map((assignment) => {
        return [assignment.doctorId, assignment];
      })
    );

    const formattedDoctors = doctors
      .map((doctor) => {
        const assignment = assignmentMap.get(doctor.id);

        return formatDoctor(doctor, assignment);
      })
      .sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) {
          return first.isPrimary ? -1 : 1;
        }

        if (first.isAssigned !== second.isAssigned) {
          return first.isAssigned ? -1 : 1;
        }

        return first.fullName.localeCompare(
          second.fullName
        );
      });

    return {
      /**
       * Kept temporarily for compatibility with the current
       * SelectDoctorScreen.
       */
      assignedDoctorId: primaryDoctorId,

      primaryDoctorId,

      assignedDoctorIds: assignments.map(
        (assignment) => assignment.doctorId
      ),

      doctors: formattedDoctors,
    };
  },

  async listAssignedDoctors(patientId: string) {
    const primaryDoctorId =
      await ensureSinglePrimaryDoctor(patientId);

    const assignments =
      await prisma.patientDoctorAssignment.findMany({
        where: {
          patientId,
          status: "ACTIVE",

          doctor: approvedAssignmentDoctorWhere,
        },
        include: {
          doctor: {
            select: doctorSelect,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const doctors = assignments
      .map(formatAssignedDoctor)
      .sort((first, second) => {
        if (
          first.assignmentType !==
          second.assignmentType
        ) {
          return first.assignmentType === "PRIMARY"
            ? -1
            : 1;
        }

        return first.doctor.fullName.localeCompare(
          second.doctor.fullName
        );
      });

    return {
      primaryDoctorId,
      totalAssignedDoctors: doctors.length,
      doctors,
    };
  },

  async assignDoctor(
    patientId: string,
    doctorId: string,
    options: AssignDoctorOptions = {}
  ) {
    const doctor = await getApprovedDoctor(doctorId);

    const [existingAssignment, activeAssignmentCount] =
      await Promise.all([
        prisma.patientDoctorAssignment.findUnique({
          where: {
            patientId_doctorId: {
              patientId,
              doctorId,
            },
          },
          select: {
            id: true,
            status: true,
            assignmentType: true,
          },
        }),

        prisma.patientDoctorAssignment.count({
          where: {
            patientId,
            status: "ACTIVE",

            doctor: approvedAssignmentDoctorWhere,
          },
        }),
      ]);

    const shouldBecomePrimary =
      options.makePrimary === true ||
      activeAssignmentCount === 0 ||
      (existingAssignment?.status === "ACTIVE" &&
        existingAssignment.assignmentType === "PRIMARY");

    await prisma.$transaction(async (transaction) => {
      if (shouldBecomePrimary) {
        await transaction.patientDoctorAssignment.updateMany({
          where: {
            patientId,
            status: "ACTIVE",
            assignmentType: "PRIMARY",

            doctorId: {
              not: doctorId,
            },
          },
          data: {
            assignmentType: "SPECIALIST",
          },
        });
      }

      await transaction.patientDoctorAssignment.upsert({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId,
          },
        },
        update: {
          status: "ACTIVE",

          assignmentType: shouldBecomePrimary
            ? "PRIMARY"
            : "SPECIALIST",
        },
        create: {
          patientId,
          doctorId,
          status: "ACTIVE",

          assignmentType: shouldBecomePrimary
            ? "PRIMARY"
            : "SPECIALIST",
        },
      });
    });

    const primaryDoctorId =
      await ensureSinglePrimaryDoctor(patientId);

    const assignment = await getAssignmentWithDoctor(
      patientId,
      doctorId
    );

    if (!assignment) {
      throw new AppError(
        "Doctor assignment could not be created",
        500
      );
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

  async setPrimaryDoctor(
    patientId: string,
    doctorId: string
  ) {
    await getApprovedDoctor(doctorId);

    const assignment =
      await prisma.patientDoctorAssignment.findUnique({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!assignment || assignment.status !== "ACTIVE") {
      throw new AppError(
        "This doctor must be assigned before setting them as primary",
        404
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.patientDoctorAssignment.updateMany({
        where: {
          patientId,
          status: "ACTIVE",
          assignmentType: "PRIMARY",
        },
        data: {
          assignmentType: "SPECIALIST",
        },
      });

      await transaction.patientDoctorAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          assignmentType: "PRIMARY",
        },
      });
    });

    const updatedAssignment =
      await getAssignmentWithDoctor(
        patientId,
        doctorId
      );

    if (!updatedAssignment) {
      throw new AppError(
        "Primary doctor could not be updated",
        500
      );
    }

    return {
      primaryDoctorId: doctorId,
      doctor: formatDoctor(
        updatedAssignment.doctor,
        updatedAssignment
      ),
    };
  },

  async removeDoctor(
    patientId: string,
    doctorId: string
  ) {
    const assignment =
      await prisma.patientDoctorAssignment.findUnique({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId,
          },
        },
        select: {
          id: true,
          status: true,
          assignmentType: true,
        },
      });

    if (!assignment || assignment.status !== "ACTIVE") {
      throw new AppError(
        "Active doctor assignment not found",
        404
      );
    }

    await prisma.patientDoctorAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: "INACTIVE",
        assignmentType: "SPECIALIST",
      },
    });

    const newPrimaryDoctorId =
      await ensureSinglePrimaryDoctor(patientId);

    return {
      removedDoctorId: doctorId,
      removedAssignmentType:
        assignment.assignmentType,
      primaryDoctorId: newPrimaryDoctorId,
    };
  },
};
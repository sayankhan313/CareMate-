import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

type PrescriptionChargePreference = "CHARGEABLE" | "EXEMPT" | "PPC";

type ExemptionChargePreference = "EXEMPT" | "PPC";

type PrescriptionExemptionType =
  | "AGE_BASED"
  | "MEDICAL_EXEMPTION"
  | "MATERNITY_EXEMPTION"
  | "LOW_INCOME_HC2"
  | "UNIVERSAL_CREDIT"
  | "PPC"
  | "OTHER";

type ListApprovedPharmaciesOptions = {
  search?: string;
  city?: string;
  postcode?: string;
  limit?: number;
};

type SavePharmacyOptions = {
  chargePreference: PrescriptionChargePreference;
};

type SubmitExemptionEvidenceInput = {
  chargePreference: ExemptionChargePreference;
  exemptionType: PrescriptionExemptionType;
  referenceNumber?: string;
  expiresAt?: string;
  evidenceDocumentUrls: string[];
};

const approvedPharmacyWhere: any = {
  role: "PHARMACY",
  accountStatus: {
    in: ["ACTIVE", "APPROVED"],
  },
  isEmailVerified: true,
  pharmacyProfile: {
    isNot: null,
  },
};

const pharmacyProfileSelect = {
  pharmacyName: true,
  staffName: true,
  phoneNumber: true,
  email: true,
  registrationNumber: true,
  address: true,
  city: true,
  postcode: true,
  openingHours: true,
  serviceType: true,
};

const pharmacySelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  accountStatus: true,
  isEmailVerified: true,
  pharmacyProfile: {
    select: pharmacyProfileSelect,
  },
};

const exemptionEvidenceSelect = {
  id: true,
  chargePreference: true,
  exemptionType: true,
  referenceNumber: true,
  evidenceDocumentUrls: true,
  expiresAt: true,
  status: true,
  verifiedAt: true,
  rejectedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
};

const normalizeOptionalText = (value?: string) => value?.trim() || undefined;

const isPharmacyAvailable = (pharmacy: any) =>
  pharmacy?.role === "PHARMACY" &&
  pharmacy?.isEmailVerified === true &&
  (pharmacy?.accountStatus === "ACTIVE" || pharmacy?.accountStatus === "APPROVED") &&
  Boolean(pharmacy?.pharmacyProfile);

const formatPharmacy = (pharmacy: any, link?: any | null) => {
  const profile = pharmacy.pharmacyProfile;

  return {
    id: pharmacy.id,
    fullName: pharmacy.fullName,
    email: pharmacy.email,
    accountStatus: pharmacy.accountStatus,
    pharmacyName: profile?.pharmacyName || pharmacy.fullName,
    staffName: profile?.staffName || null,
    phoneNumber: profile?.phoneNumber || null,
    registrationNumber: profile?.registrationNumber || null,
    address: profile?.address || null,
    city: profile?.city || null,
    postcode: profile?.postcode || null,
    openingHours: profile?.openingHours || null,
    serviceType: profile?.serviceType || null,
    isAvailable: isPharmacyAvailable(pharmacy),
    isSaved: Boolean(link),
    isPrimary: Boolean(link?.isPrimary),
    linkId: link?.id || null,
    chargePreference: link?.chargePreference || null,
    savedAt: link?.createdAt || null,
    updatedAt: link?.updatedAt || null,
  };
};

const formatExemptionEvidence = (evidence: {
  id: string;
  chargePreference: PrescriptionChargePreference;
  exemptionType: string;
  referenceNumber: string | null;
  evidenceDocumentUrls: string[];
  expiresAt: Date | null;
  status: string;
  verifiedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: evidence.id,
  chargePreference: evidence.chargePreference,
  exemptionType: evidence.exemptionType,
  referenceNumber: evidence.referenceNumber,
  expiresAt: evidence.expiresAt,
  status: evidence.status,
  verifiedAt: evidence.verifiedAt,
  rejectedAt: evidence.rejectedAt,
  rejectionReason: evidence.rejectionReason,
  documentCount: evidence.evidenceDocumentUrls.length,
  documents: evidence.evidenceDocumentUrls.map((storedPath, index) => ({
    index,
    fileName: storedPath.split("/").pop() || `Document ${index + 1}`,
  })),
  submittedAt: evidence.createdAt,
  updatedAt: evidence.updatedAt,
});

const getPatientOrThrow = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: {
      id: patientId,
      role: "PATIENT",
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!patient) {
    throw new AppError("Patient account not found", 404);
  }

  return patient;
};

const getApprovedPharmacy = async (pharmacyId: string) => {
  const pharmacy = await prisma.user.findFirst({
    where: {
      id: pharmacyId,
      ...approvedPharmacyWhere,
    },
    select: pharmacySelect,
  });

  if (!pharmacy || !pharmacy.pharmacyProfile) {
    throw new AppError(
      "Pharmacy not found or pharmacy account is not approved yet",
      404
    );
  }

  return pharmacy;
};

const getPatientPharmacyLink = async (patientId: string, pharmacyId: string) => {
  return prisma.patientPharmacyLink.findUnique({
    where: {
      patientId_pharmacyId: {
        patientId,
        pharmacyId,
      },
    },
    include: {
      pharmacy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          accountStatus: true,
          isEmailVerified: true,
          pharmacyProfile: {
            select: pharmacyProfileSelect,
          },
        },
      },
    },
  });
};

const getSavedPharmacyLinkOrThrow = async (
  patientId: string,
  pharmacyId: string
) => {
  const link = await prisma.patientPharmacyLink.findUnique({
    where: {
      patientId_pharmacyId: {
        patientId,
        pharmacyId,
      },
    },
    select: {
      id: true,
      patientId: true,
      pharmacyId: true,
      isPrimary: true,
      chargePreference: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!link) {
    throw new AppError(
      "This pharmacy must be saved before exemption evidence can be submitted",
      404
    );
  }

  return link;
};

const ensureSinglePrimaryPharmacy = async (patientId: string) => {
  const [availableLinks, totalPrimaryCount] = await Promise.all([
    prisma.patientPharmacyLink.findMany({
      where: {
        patientId,
        pharmacy: approvedPharmacyWhere,
      },
      select: {
        id: true,
        pharmacyId: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.patientPharmacyLink.count({
      where: {
        patientId,
        isPrimary: true,
      },
    }),
  ]);

  if (availableLinks.length === 0) {
    if (totalPrimaryCount > 0) {
      await prisma.patientPharmacyLink.updateMany({
        where: {
          patientId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return null;
  }

  const availablePrimaryLinks = availableLinks.filter(link => link.isPrimary);
  const selectedPrimary = availablePrimaryLinks[0] || availableLinks[0];

  if (totalPrimaryCount !== 1 || !selectedPrimary.isPrimary) {
    await prisma.$transaction(async transaction => {
      await transaction.patientPharmacyLink.updateMany({
        where: {
          patientId,
          isPrimary: true,
          id: {
            not: selectedPrimary.id,
          },
        },
        data: {
          isPrimary: false,
        },
      });

      await transaction.patientPharmacyLink.update({
        where: {
          id: selectedPrimary.id,
        },
        data: {
          isPrimary: true,
        },
      });
    });
  }

  return selectedPrimary.pharmacyId;
};

const validateExemptionEvidence = (input: SubmitExemptionEvidenceInput) => {
  if (
    input.evidenceDocumentUrls.length < 1 ||
    input.evidenceDocumentUrls.length > 3
  ) {
    throw new AppError(
      "Between one and three exemption evidence documents are required",
      400
    );
  }

  if (
    input.chargePreference === "PPC" &&
    input.exemptionType !== "PPC"
  ) {
    throw new AppError(
      "PPC evidence must use exemption type PPC",
      400
    );
  }

  if (
    input.chargePreference === "EXEMPT" &&
    input.exemptionType === "PPC"
  ) {
    throw new AppError(
      "PPC must be submitted using charge preference PPC",
      400
    );
  }
};

export const pharmacyLinkService = {
  async listApprovedPharmacies(
    patientId: string,
    options: ListApprovedPharmaciesOptions = {}
  ) {
    await getPatientOrThrow(patientId);

    const search = normalizeOptionalText(options.search);
    const city = normalizeOptionalText(options.city);
    const postcode = normalizeOptionalText(options.postcode);
    const limit = Math.min(Math.max(options.limit || 30, 1), 50);

    const primaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);

    const pharmacyWhere: any = {
      ...approvedPharmacyWhere,
    };

    const profileFilters: any = {};

    if (city) {
      profileFilters.city = {
        equals: city,
        mode: "insensitive",
      };
    }

    if (postcode) {
      profileFilters.postcode = {
        contains: postcode,
        mode: "insensitive",
      };
    }

    if (Object.keys(profileFilters).length > 0) {
      pharmacyWhere.pharmacyProfile = {
        is: profileFilters,
      };
    }

    if (search) {
      pharmacyWhere.OR = [
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
          pharmacyProfile: {
            is: {
              pharmacyName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          pharmacyProfile: {
            is: {
              city: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          pharmacyProfile: {
            is: {
              postcode: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const pharmacies = await prisma.user.findMany({
      where: pharmacyWhere,
      select: pharmacySelect,
      orderBy: {
        fullName: "asc",
      },
      take: limit,
    });

    const pharmacyIds = pharmacies.map(pharmacy => pharmacy.id);

    const links =
      pharmacyIds.length === 0
        ? []
        : await prisma.patientPharmacyLink.findMany({
            where: {
              patientId,
              pharmacyId: {
                in: pharmacyIds,
              },
            },
            select: {
              id: true,
              pharmacyId: true,
              isPrimary: true,
              chargePreference: true,
              createdAt: true,
              updatedAt: true,
            },
          });

    const linkMap = new Map(
      links.map(link => [link.pharmacyId, link])
    );

    const formattedPharmacies = pharmacies
      .map(pharmacy =>
        formatPharmacy(
          pharmacy,
          linkMap.get(pharmacy.id)
        )
      )
      .sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) {
          return first.isPrimary ? -1 : 1;
        }

        if (first.isSaved !== second.isSaved) {
          return first.isSaved ? -1 : 1;
        }

        return first.pharmacyName.localeCompare(second.pharmacyName);
      });

    return {
      primaryPharmacyId,
      total: formattedPharmacies.length,
      pharmacies: formattedPharmacies,
    };
  },

  async listSavedPharmacies(patientId: string) {
    await getPatientOrThrow(patientId);

    const primaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);

    const links = await prisma.patientPharmacyLink.findMany({
      where: {
        patientId,
      },
      include: {
        pharmacy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            accountStatus: true,
            isEmailVerified: true,
            pharmacyProfile: {
              select: pharmacyProfileSelect,
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const pharmacies = links
      .map(link => formatPharmacy(link.pharmacy, link))
      .sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) {
          return first.isPrimary ? -1 : 1;
        }

        if (first.isAvailable !== second.isAvailable) {
          return first.isAvailable ? -1 : 1;
        }

        return first.pharmacyName.localeCompare(second.pharmacyName);
      });

    return {
      primaryPharmacyId,
      totalSavedPharmacies: pharmacies.length,
      pharmacies,
    };
  },

  async savePharmacy(
    patientId: string,
    pharmacyId: string,
    options: SavePharmacyOptions
  ) {
    await getPatientOrThrow(patientId);

    const pharmacy = await getApprovedPharmacy(pharmacyId);

    const currentPrimaryPharmacyId =
      await ensureSinglePrimaryPharmacy(patientId);

    const existingLink = await prisma.patientPharmacyLink.findUnique({
      where: {
        patientId_pharmacyId: {
          patientId,
          pharmacyId,
        },
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    const shouldBecomePrimary =
      currentPrimaryPharmacyId === null ||
      currentPrimaryPharmacyId === pharmacyId ||
      existingLink?.isPrimary === true;

    await prisma.$transaction(async transaction => {
      if (shouldBecomePrimary) {
        await transaction.patientPharmacyLink.updateMany({
          where: {
            patientId,
            pharmacyId: {
              not: pharmacyId,
            },
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      await transaction.patientPharmacyLink.upsert({
        where: {
          patientId_pharmacyId: {
            patientId,
            pharmacyId,
          },
        },
        update: {
          chargePreference: options.chargePreference,
          isPrimary: shouldBecomePrimary,
        },
        create: {
          patientId,
          pharmacyId,
          chargePreference: options.chargePreference,
          isPrimary: shouldBecomePrimary,
        },
      });
    });

    const primaryPharmacyId =
      await ensureSinglePrimaryPharmacy(patientId);

    const link = await getPatientPharmacyLink(
      patientId,
      pharmacyId
    );

    if (!link) {
      throw new AppError(
        "Pharmacy could not be saved",
        500
      );
    }

    return {
      primaryPharmacyId,
      pharmacy: formatPharmacy(
        pharmacy,
        link
      ),
      link: {
        id: link.id,
        pharmacyId: link.pharmacyId,
        isPrimary: link.isPrimary,
        chargePreference: link.chargePreference,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      },
    };
  },

  async setPrimaryPharmacy(
    patientId: string,
    pharmacyId: string
  ) {
    await getPatientOrThrow(patientId);

    const pharmacy = await getApprovedPharmacy(pharmacyId);

    const link = await prisma.patientPharmacyLink.findUnique({
      where: {
        patientId_pharmacyId: {
          patientId,
          pharmacyId,
        },
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!link) {
      throw new AppError(
        "This pharmacy must be saved before setting it as primary",
        404
      );
    }

    if (!link.isPrimary) {
      await prisma.$transaction(async transaction => {
        await transaction.patientPharmacyLink.updateMany({
          where: {
            patientId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });

        await transaction.patientPharmacyLink.update({
          where: {
            id: link.id,
          },
          data: {
            isPrimary: true,
          },
        });
      });
    }

    const primaryPharmacyId =
      await ensureSinglePrimaryPharmacy(patientId);

    const updatedLink = await getPatientPharmacyLink(
      patientId,
      pharmacyId
    );

    if (!updatedLink) {
      throw new AppError(
        "Primary pharmacy could not be updated",
        500
      );
    }

    return {
      primaryPharmacyId,
      pharmacy: formatPharmacy(
        pharmacy,
        updatedLink
      ),
      link: {
        id: updatedLink.id,
        pharmacyId: updatedLink.pharmacyId,
        isPrimary: updatedLink.isPrimary,
        chargePreference: updatedLink.chargePreference,
        createdAt: updatedLink.createdAt,
        updatedAt: updatedLink.updatedAt,
      },
    };
  },

  async updateChargePreference(
    patientId: string,
    pharmacyId: string,
    chargePreference: PrescriptionChargePreference
  ) {
    await getPatientOrThrow(patientId);

    const existingLink =
      await prisma.patientPharmacyLink.findUnique({
        where: {
          patientId_pharmacyId: {
            patientId,
            pharmacyId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!existingLink) {
      throw new AppError(
        "Saved pharmacy not found",
        404
      );
    }

    await prisma.patientPharmacyLink.update({
      where: {
        id: existingLink.id,
      },
      data: {
        chargePreference,
      },
    });

    const link = await getPatientPharmacyLink(
      patientId,
      pharmacyId
    );

    if (!link) {
      throw new AppError(
        "Prescription charge preference could not be updated",
        500
      );
    }

    return {
      primaryPharmacyId:
        await ensureSinglePrimaryPharmacy(patientId),
      pharmacy: formatPharmacy(
        link.pharmacy,
        link
      ),
      chargePreference: link.chargePreference,
    };
  },

  async submitExemptionEvidence(
    patientId: string,
    pharmacyId: string,
    input: SubmitExemptionEvidenceInput
  ) {
    await getPatientOrThrow(patientId);

    await getApprovedPharmacy(pharmacyId);

    validateExemptionEvidence(input);

    const link = await getSavedPharmacyLinkOrThrow(
      patientId,
      pharmacyId
    );

    const existingPending =
      await prisma.patientPharmacyExemptionEvidence.findFirst({
        where: {
          patientId,
          pharmacyId,
          status: "PENDING",
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (existingPending) {
      throw new AppError(
        "Exemption evidence is already awaiting review by this pharmacy",
        409
      );
    }

    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : null;

    if (
      expiresAt &&
      Number.isNaN(expiresAt.getTime())
    ) {
      throw new AppError(
        "Invalid exemption expiry date",
        400
      );
    }

    const evidence = await prisma.$transaction(
      async transaction => {
        await transaction.patientPharmacyLink.update({
          where: {
            id: link.id,
          },
          data: {
            chargePreference: input.chargePreference,
          },
        });

        return transaction.patientPharmacyExemptionEvidence.create({
          data: {
            linkId: link.id,
            patientId,
            pharmacyId,
            chargePreference: input.chargePreference,
            exemptionType: input.exemptionType,
            referenceNumber:
              normalizeOptionalText(input.referenceNumber) || null,
            evidenceDocumentUrls: input.evidenceDocumentUrls,
            expiresAt,
            status: "PENDING",
          },
          select: exemptionEvidenceSelect,
        });
      }
    );

    return {
      pharmacyId,
      chargePreference: input.chargePreference,
      verificationRequired: true,
      evidence: formatExemptionEvidence(evidence),
    };
  },

  async listExemptionEvidence(
    patientId: string,
    pharmacyId: string
  ) {
    await getPatientOrThrow(patientId);

    const link = await getSavedPharmacyLinkOrThrow(
      patientId,
      pharmacyId
    );

    const evidence =
      await prisma.patientPharmacyExemptionEvidence.findMany({
        where: {
          patientId,
          pharmacyId,
        },
        select: exemptionEvidenceSelect,
        orderBy: {
          createdAt: "desc",
        },
      });

    const formattedEvidence = evidence.map(
      formatExemptionEvidence
    );

    return {
      pharmacyId,
      currentChargePreference: link.chargePreference,
      evidenceRequired:
        link.chargePreference === "EXEMPT" ||
        link.chargePreference === "PPC",
      latestEvidence: formattedEvidence[0] || null,
      total: formattedEvidence.length,
      evidence: formattedEvidence,
    };
  },

  async removePharmacy(
    patientId: string,
    pharmacyId: string
  ) {
    await getPatientOrThrow(patientId);

    const link = await prisma.patientPharmacyLink.findUnique({
      where: {
        patientId_pharmacyId: {
          patientId,
          pharmacyId,
        },
      },
      select: {
        id: true,
        pharmacyId: true,
        isPrimary: true,
        chargePreference: true,
      },
    });

    if (!link) {
      throw new AppError(
        "Saved pharmacy not found",
        404
      );
    }

    await prisma.patientPharmacyLink.delete({
      where: {
        id: link.id,
      },
    });

    const primaryPharmacyId =
      await ensureSinglePrimaryPharmacy(patientId);

    return {
      removedPharmacyId: pharmacyId,
      removedPrimaryPharmacy: link.isPrimary,
      previousChargePreference: link.chargePreference,
      primaryPharmacyId,
    };
  },
};
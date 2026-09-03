import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { patientPrescriptionChargeService } from "./patient-prescription-charge.service.js";

type ListApprovedPharmaciesOptions = {
  search?: string;
  city?: string;
  postcode?: string;
  limit?: number;
};

const approvedPharmacyWhere: any = {
  role: "PHARMACY",
  accountStatus: { in: ["ACTIVE", "APPROVED"] },
  isEmailVerified: true,
  pharmacyProfile: { isNot: null },
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
  pharmacyProfile: { select: pharmacyProfileSelect },
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
    savedAt: link?.createdAt || null,
    updatedAt: link?.updatedAt || null,
  };
};

const getPatientOrThrow = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, fullName: true },
  });

  if (!patient) throw new AppError("Patient account not found", 404);
  return patient;
};

const getApprovedPharmacy = async (pharmacyId: string) => {
  const pharmacy = await prisma.user.findFirst({
    where: { id: pharmacyId, ...approvedPharmacyWhere },
    select: pharmacySelect,
  });

  if (!pharmacy || !pharmacy.pharmacyProfile) {
    throw new AppError("Pharmacy not found or pharmacy account is not approved yet", 404);
  }

  return pharmacy;
};

const getPatientPharmacyLink = async (patientId: string, pharmacyId: string) =>
  prisma.patientPharmacyLink.findUnique({
    where: { patientId_pharmacyId: { patientId, pharmacyId } },
    include: {
      pharmacy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          accountStatus: true,
          isEmailVerified: true,
          pharmacyProfile: { select: pharmacyProfileSelect },
        },
      },
    },
  });

const notifyPharmacyPatientLinked = async ({
  pharmacyId,
  patientId,
  patientName,
  linkId,
  isPrimary,
}: {
  pharmacyId: string;
  patientId: string;
  patientName: string;
  linkId: string;
  isPrimary: boolean;
}) => {
  try {
    const existing = await prisma.userNotification.findFirst({
      where: {
        userId: pharmacyId,
        type: "PHARMACY_PATIENT_LINKED",
        entityType: "PATIENT_PHARMACY_LINK",
        entityId: linkId,
      },
      select: { id: true },
    });

    if (existing) return;

    await notificationService.createAndSend({
      userId: pharmacyId,
      type: "PHARMACY_PATIENT_LINKED",
      title: "New patient linked",
      body: `${patientName} has selected your pharmacy in CareMate+.`,
      priority: "NORMAL",
      entityType: "PATIENT_PHARMACY_LINK",
      entityId: linkId,
      targetScreen: "PharmacyDashboard",
      data: {
        patientId,
        patientName,
        pharmacyId,
        linkId,
        isPrimary,
        source: "PATIENT_PHARMACY_LINK",
        recipientRole: "PHARMACY",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify pharmacy ${pharmacyId} about patient link ${linkId}:`,
      error instanceof Error ? error.message : error,
    );
  }
};

const ensureSinglePrimaryPharmacy = async (patientId: string) => {
  const [availableLinks, totalPrimaryCount] = await Promise.all([
    prisma.patientPharmacyLink.findMany({
      where: { patientId, pharmacy: approvedPharmacyWhere },
      select: { id: true, pharmacyId: true, isPrimary: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.patientPharmacyLink.count({
      where: { patientId, isPrimary: true },
    }),
  ]);

  if (availableLinks.length === 0) {
    if (totalPrimaryCount > 0) {
      await prisma.patientPharmacyLink.updateMany({
        where: { patientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return null;
  }

  const selectedPrimary = availableLinks.find(link => link.isPrimary) || availableLinks[0];

  if (totalPrimaryCount !== 1 || !selectedPrimary.isPrimary) {
    await prisma.$transaction(async tx => {
      await tx.patientPharmacyLink.updateMany({
        where: {
          patientId,
          isPrimary: true,
          id: { not: selectedPrimary.id },
        },
        data: { isPrimary: false },
      });

      await tx.patientPharmacyLink.update({
        where: { id: selectedPrimary.id },
        data: { isPrimary: true },
      });
    });
  }

  return selectedPrimary.pharmacyId;
};

export const pharmacyLinkService = {
  async listApprovedPharmacies(patientId: string, options: ListApprovedPharmaciesOptions = {}) {
    await getPatientOrThrow(patientId);

    const search = normalizeOptionalText(options.search);
    const city = normalizeOptionalText(options.city);
    const postcode = normalizeOptionalText(options.postcode);
    const limit = Math.min(Math.max(options.limit || 30, 1), 50);
    const primaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);

    const pharmacyWhere: any = { ...approvedPharmacyWhere };
    const profileFilters: any = {};

    if (city) profileFilters.city = { equals: city, mode: "insensitive" };
    if (postcode) profileFilters.postcode = { contains: postcode, mode: "insensitive" };

    if (Object.keys(profileFilters).length > 0) {
      pharmacyWhere.pharmacyProfile = { is: profileFilters };
    }

    if (search) {
      pharmacyWhere.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { pharmacyProfile: { is: { pharmacyName: { contains: search, mode: "insensitive" } } } },
        { pharmacyProfile: { is: { city: { contains: search, mode: "insensitive" } } } },
        { pharmacyProfile: { is: { postcode: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const pharmacies = await prisma.user.findMany({
      where: pharmacyWhere,
      select: pharmacySelect,
      orderBy: { fullName: "asc" },
      take: limit,
    });

    const pharmacyIds = pharmacies.map(pharmacy => pharmacy.id);

    const links = pharmacyIds.length === 0
      ? []
      : await prisma.patientPharmacyLink.findMany({
          where: { patientId, pharmacyId: { in: pharmacyIds } },
          select: { id: true, pharmacyId: true, isPrimary: true, createdAt: true, updatedAt: true },
        });

    const linkMap = new Map(links.map(link => [link.pharmacyId, link]));

    const formattedPharmacies = pharmacies
      .map(pharmacy => formatPharmacy(pharmacy, linkMap.get(pharmacy.id)))
      .sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        if (a.isSaved !== b.isSaved) return a.isSaved ? -1 : 1;
        return a.pharmacyName.localeCompare(b.pharmacyName);
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
      where: { patientId },
      include: {
        pharmacy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            accountStatus: true,
            isEmailVerified: true,
            pharmacyProfile: { select: pharmacyProfileSelect },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const pharmacies = links
      .map(link => formatPharmacy(link.pharmacy, link))
      .sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        return a.pharmacyName.localeCompare(b.pharmacyName);
      });

    return {
      primaryPharmacyId,
      totalSavedPharmacies: pharmacies.length,
      pharmacies,
    };
  },

  async savePharmacy(patientId: string, pharmacyId: string) {
    const patient = await getPatientOrThrow(patientId);
    const pharmacy = await getApprovedPharmacy(pharmacyId);
    const currentPrimaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);

    const existingLink = await prisma.patientPharmacyLink.findUnique({
      where: { patientId_pharmacyId: { patientId, pharmacyId } },
      select: { id: true, isPrimary: true },
    });

    const isNewLink = !existingLink;

    const shouldBecomePrimary =
      currentPrimaryPharmacyId === null ||
      currentPrimaryPharmacyId === pharmacyId ||
      existingLink?.isPrimary === true;

    const chargePreference = await patientPrescriptionChargeService.getSelectedPreference(patientId);

    await prisma.$transaction(async tx => {
      if (shouldBecomePrimary) {
        await tx.patientPharmacyLink.updateMany({
          where: {
            patientId,
            pharmacyId: { not: pharmacyId },
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      await tx.patientPharmacyLink.upsert({
        where: { patientId_pharmacyId: { patientId, pharmacyId } },
        update: {
          chargePreference,
          isPrimary: shouldBecomePrimary,
        },
        create: {
          patientId,
          pharmacyId,
          chargePreference,
          isPrimary: shouldBecomePrimary,
        },
      });
    });

    const primaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);
    const link = await getPatientPharmacyLink(patientId, pharmacyId);

    if (!link) throw new AppError("Pharmacy could not be saved", 500);

    if (isNewLink) {
      await notifyPharmacyPatientLinked({
        pharmacyId,
        patientId,
        patientName: patient.fullName,
        linkId: link.id,
        isPrimary: link.isPrimary,
      });
    }

    return {
      primaryPharmacyId,
      pharmacy: formatPharmacy(pharmacy, link),
      link: {
        id: link.id,
        pharmacyId: link.pharmacyId,
        isPrimary: link.isPrimary,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      },
    };
  },

  async setPrimaryPharmacy(patientId: string, pharmacyId: string) {
    await getPatientOrThrow(patientId);
    const pharmacy = await getApprovedPharmacy(pharmacyId);

    const link = await prisma.patientPharmacyLink.findUnique({
      where: { patientId_pharmacyId: { patientId, pharmacyId } },
      select: { id: true, isPrimary: true },
    });

    if (!link) {
      throw new AppError("This pharmacy must be saved before setting it as primary", 404);
    }

    if (!link.isPrimary) {
      await prisma.$transaction(async tx => {
        await tx.patientPharmacyLink.updateMany({
          where: { patientId, isPrimary: true },
          data: { isPrimary: false },
        });

        await tx.patientPharmacyLink.update({
          where: { id: link.id },
          data: { isPrimary: true },
        });
      });
    }

    const primaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);
    const updatedLink = await getPatientPharmacyLink(patientId, pharmacyId);

    if (!updatedLink) throw new AppError("Primary pharmacy could not be updated", 500);

    return {
      primaryPharmacyId,
      pharmacy: formatPharmacy(pharmacy, updatedLink),
      link: {
        id: updatedLink.id,
        pharmacyId: updatedLink.pharmacyId,
        isPrimary: updatedLink.isPrimary,
        createdAt: updatedLink.createdAt,
        updatedAt: updatedLink.updatedAt,
      },
    };
  },

  async removePharmacy(patientId: string, pharmacyId: string) {
    await getPatientOrThrow(patientId);

    const link = await prisma.patientPharmacyLink.findUnique({
      where: { patientId_pharmacyId: { patientId, pharmacyId } },
      select: { id: true, isPrimary: true },
    });

    if (!link) throw new AppError("Saved pharmacy not found", 404);

    const pendingEvidence = await prisma.patientPharmacyExemptionEvidence.count({
      where: { patientId, pharmacyId, status: "PENDING" },
    });

    if (pendingEvidence > 0) {
      throw new AppError(
        "This pharmacy is reviewing your exemption evidence. Wait for the review or change your payment preference before removing it.",
        409,
      );
    }

    await prisma.patientPharmacyLink.delete({
      where: { id: link.id },
    });

    const primaryPharmacyId = await ensureSinglePrimaryPharmacy(patientId);

    return {
      removedPharmacyId: pharmacyId,
      removedPrimaryPharmacy: link.isPrimary,
      primaryPharmacyId,
    };
  },
};
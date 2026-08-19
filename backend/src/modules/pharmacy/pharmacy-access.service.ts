import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

export const ensureApprovedPharmacy = async (pharmacyId: string) => {
  const pharmacy = await prisma.user.findUnique({
    where: { id: pharmacyId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
      isEmailVerified: true,
      pharmacyProfile: {
        select: {
          pharmacyName: true,
          registrationNumber: true,
          city: true,
          postcode: true,
        },
      },
    },
  });

  if (!pharmacy) throw new AppError("Pharmacy account not found", 404);
  if (pharmacy.role !== "PHARMACY") throw new AppError("Only pharmacies can access this resource", 403);
  if (!pharmacy.isEmailVerified) throw new AppError("Please verify your email first", 403);

  if (pharmacy.accountStatus !== "ACTIVE" && pharmacy.accountStatus !== "APPROVED") {
    throw new AppError("Pharmacy account is not approved yet", 403);
  }

  if (!pharmacy.pharmacyProfile) throw new AppError("Pharmacy profile is unavailable", 404);

  return { ...pharmacy, pharmacyProfile: pharmacy.pharmacyProfile };
};
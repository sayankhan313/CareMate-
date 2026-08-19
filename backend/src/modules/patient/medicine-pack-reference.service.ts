import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeStrength = (value: string) =>
  value
    .toLowerCase()
    .replace(/µg/g, "mcg")
    .replace(/\s+/g, "")
    .trim();

const getReferenceNames = (reference: {
  brandName: string;
  genericName: string;
  aliases: string[];
}) => [
  reference.brandName,
  reference.genericName,
  ...(reference.aliases || []),
];

export const medicinePackReferenceService = {
  async findPackReference(
    medicineName: string,
    strength: string,
  ) {
    const normalizedMedicineName =
      normalizeName(medicineName);

    const normalizedStrength =
      normalizeStrength(strength);

    if (!normalizedMedicineName) {
      throw new AppError(
        "Medicine name is required",
        400,
      );
    }

    if (!normalizedStrength) {
      throw new AppError(
        "Medicine strength is required",
        400,
      );
    }

    const medicineReferences =
      await prisma.medicineReference.findMany({
        where: {
          isActive: true,
        },
        select: {
          slug: true,
          brandName: true,
          genericName: true,
          aliases: true,
        },
      });

    const medicineReference =
      medicineReferences.find(reference =>
        getReferenceNames(reference).some(
          candidate =>
            normalizeName(candidate) ===
            normalizedMedicineName,
        ),
      ) ||
      medicineReferences.find(reference =>
        getReferenceNames(reference).some(
          candidate => {
            const normalizedCandidate =
              normalizeName(candidate);

            return (
              normalizedCandidate.length >= 3 &&
              (normalizedMedicineName.includes(
                normalizedCandidate,
              ) ||
                normalizedCandidate.includes(
                  normalizedMedicineName,
                ))
            );
          },
        ),
      );

    if (!medicineReference) {
      throw new AppError(
        "Pack information is not available for this medicine",
        404,
      );
    }

    const packReferences =
      await prisma.medicinePackReference.findMany({
        where: {
          medicineSlug:
            medicineReference.slug,
          isActive: true,
        },
        select: {
          id: true,
          medicineSlug: true,
          medicineName: true,
          strength: true,
          form: true,
          packageUnit: true,
          packSize: true,
          contentUnit: true,
        },
      });

    const packReference =
      packReferences.find(
        reference =>
          normalizeStrength(
            reference.strength,
          ) === normalizedStrength,
      );

    if (!packReference) {
      throw new AppError(
        `Pack information is not available for ${medicineName} ${strength}`,
        404,
      );
    }

    return packReference;
  },
};
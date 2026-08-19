import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.+/]/g, "");

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const findMedicineReference = async (
  medicineName: string,
) => {
  const normalizedInput =
    normalizeName(medicineName);

  const references =
    await prisma.medicineReference.findMany({
      select: {
        slug: true,
        brandName: true,
        genericName: true,
        aliases: true,
      },
    });

  return (
    references.find(reference => {
      const names = [
        reference.brandName,
        reference.genericName,
        ...reference.aliases,
      ];

      return names.some(
        name =>
          normalizeName(name) ===
          normalizedInput,
      );
    }) ?? null
  );
};

export const pharmacyPackReferenceService = {
  async findPackReference(
    medicineName: string,
    strength: string,
  ) {
    const reference =
      await findMedicineReference(
        medicineName,
      );

    if (!reference) {
      return null;
    }

    const packReferences =
      await prisma.medicinePackReference.findMany({
        where: {
          medicineSlug:
            reference.slug,
          isActive: true,
        },

        orderBy: {
          strength: "asc",
        },
      });

    const normalizedStrength =
      normalize(strength);

    return (
      packReferences.find(
        item =>
          normalize(
            item.strength,
          ) ===
          normalizedStrength,
      ) ?? null
    );
  },

  async calculateDispensedQuantity(input: {
    medicineName: string;
    strength: string;
    packageQuantity: number;
  }) {
    if (
      !Number.isInteger(
        input.packageQuantity,
      ) ||
      input.packageQuantity < 1
    ) {
      throw new AppError(
        "Package quantity must be at least 1",
        400,
      );
    }

    const pack =
      await this.findPackReference(
        input.medicineName,
        input.strength,
      );

    if (!pack) {
      throw new AppError(
        "Pack size reference was not found for this medicine and strength",
        409,
      );
    }

    return {
      medicineSlug:
        pack.medicineSlug,

      medicineName:
        pack.medicineName,

      strength:
        pack.strength,

      packageUnit:
        pack.packageUnit,

      packages:
        input.packageQuantity,

      packSize:
        pack.packSize,

      contentUnit:
        pack.contentUnit,

      dispensedQuantity:
        input.packageQuantity *
        pack.packSize,
    };
  },
};
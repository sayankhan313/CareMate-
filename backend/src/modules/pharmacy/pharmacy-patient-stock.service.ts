import type { Prisma } from "../../generated/prisma/client.js";

import { AppError } from "../../utils/AppError.js";

const normalizeStockUnit = (value: string) => {
  const normalized = value.trim().toLowerCase();

  const aliases: Record<string, string> = {
    tablet: "tablets",
    tablets: "tablets",
    tab: "tablets",
    tabs: "tablets",
    capsule: "capsules",
    capsules: "capsules",
    cap: "capsules",
    caps: "capsules",
    puff: "puffs",
    puffs: "puffs",
    dose: "doses",
    doses: "doses",
    sachet: "sachets",
    sachets: "sachets",
    patch: "patches",
    patches: "patches",
    inhaler: "inhalers",
    inhalers: "inhalers",
    bottle: "bottles",
    bottles: "bottles",
    ml: "ml",
    millilitre: "ml",
    millilitres: "ml",
  };

  return aliases[normalized] || normalized;
};

type MedicineStockAddition = {
  quantity: number;
  unit: string;
};

export const addDispensedOrderStockToPatient = async (
  tx: Prisma.TransactionClient,
  patientId: string,
  orderId: string,
) => {
  const items = await tx.medicineOrderItem.findMany({
    where: {
      orderId,
      medicineId: {
        not: null,
      },
      dispensedQuantity: {
        gt: 0,
      },
      dispensedUnit: {
        not: null,
      },
    },
    select: {
      id: true,
      medicineId: true,
      name: true,
      dispensedQuantity: true,
      dispensedUnit: true,
    },
  });

  if (items.length === 0) {
    return {
      updatedMedicines: 0,
      totalUnitsAdded: 0,
    };
  }

  const additions = new Map<string, MedicineStockAddition>();

  for (const item of items) {
    if (!item.medicineId) continue;
    if (!item.dispensedQuantity || item.dispensedQuantity <= 0) continue;
    if (!item.dispensedUnit?.trim()) continue;

    const unit = normalizeStockUnit(item.dispensedUnit);
    const existing = additions.get(item.medicineId);

    if (existing) {
      if (existing.unit !== unit) {
        throw new AppError(
          `Dispensed stock for ${item.name} uses inconsistent stock units.`,
          409,
        );
      }

      existing.quantity += item.dispensedQuantity;
      continue;
    }

    additions.set(item.medicineId, {
      quantity: item.dispensedQuantity,
      unit,
    });
  }

  let updatedMedicines = 0;
  let totalUnitsAdded = 0;

  for (const [medicineId, addition] of additions.entries()) {
    const medicine = await tx.medicine.findFirst({
      where: {
        id: medicineId,
        patientId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        stockUnit: true,
        lowStockThreshold: true,
      },
    });

    if (!medicine) {
      throw new AppError(
        "A dispensed medicine is no longer available in the patient's active medicine list.",
        409,
      );
    }

    const existingStock = Math.max(medicine.currentStock ?? 0, 0);
    const existingUnit = medicine.stockUnit?.trim()
      ? normalizeStockUnit(medicine.stockUnit)
      : null;

    if (
      existingStock > 0 &&
      existingUnit &&
      existingUnit !== addition.unit
    ) {
      throw new AppError(
        `Patient stock for ${medicine.name} is recorded in ${medicine.stockUnit}, but the dispensed medicine uses ${addition.unit}.`,
        409,
      );
    }

    const updatedStock = existingStock + addition.quantity;

    await tx.medicine.update({
      where: {
        id: medicine.id,
      },
      data: {
        hasMedicineOnHand: true,
        currentStock: updatedStock,
        stockUnit: existingUnit || addition.unit,
      },
    });

    await tx.medicineReminder.updateMany({
      where: {
        medicineId: medicine.id,
        reviewStatus: {
          in: ["NOT_REQUESTED", "APPROVED"],
        },
      },
      data: {
        isActive: true,
      },
    });

    updatedMedicines += 1;
    totalUnitsAdded += addition.quantity;
  }

  return {
    updatedMedicines,
    totalUnitsAdded,
  };
};
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import type {
  CreatePharmacyInventoryItemInput,
  PharmacyInventoryItem,
  PharmacyInventoryListResponse,
  UpdatePharmacyInventoryItemInput,
} from "./pharmacy-inventory.types.js";

const inventorySelect = {
  id: true,
  medicineName: true,
  strength: true,
  form: true,
  stockUnit: true,
  quantityInStock: true,
  reservedQuantity: true,
  lowStockThreshold: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const formatInventoryItem = (item: {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  quantityInStock: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PharmacyInventoryItem => {
  const availableQuantity = Math.max(item.quantityInStock - item.reservedQuantity, 0);

  return {
    ...item,
    availableQuantity,
    isLowStock: availableQuantity <= item.lowStockThreshold,
  };
};

const getInventoryItem = async (pharmacyId: string, itemId: string) => {
  const item = await prisma.pharmacyInventoryItem.findFirst({
    where: {
      id: itemId,
      pharmacyId,
    },
    select: inventorySelect,
  });

  if (!item) {
    throw new AppError("Inventory item not found for this pharmacy", 404);
  }

  return item;
};

export const pharmacyInventoryService = {
  async listInventory(
    pharmacyId: string,
    options: {
      search?: string;
      lowStock?: boolean;
      active: boolean;
      limit: number;
    },
  ): Promise<PharmacyInventoryListResponse> {
    await ensureApprovedPharmacy(pharmacyId);

    const items = await prisma.pharmacyInventoryItem.findMany({
      where: {
        pharmacyId,
        isActive: options.active,
        ...(options.search
          ? {
              medicineName: {
                contains: options.search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      select: inventorySelect,
      orderBy: [{ medicineName: "asc" }, { strength: "asc" }],
      take: options.limit,
    });

    const formatted = items.map(formatInventoryItem);

    const filtered =
      options.lowStock === undefined
        ? formatted
        : formatted.filter(item => item.isLowStock === options.lowStock);

    return {
      total: filtered.length,
      lowStockCount: formatted.filter(item => item.isLowStock).length,
      items: filtered,
    };
  },

  async createInventoryItem(
    pharmacyId: string,
    input: CreatePharmacyInventoryItemInput,
  ) {
    await ensureApprovedPharmacy(pharmacyId);

    const duplicate = await prisma.pharmacyInventoryItem.findFirst({
      where: {
        pharmacyId,
        medicineName: {
          equals: input.medicineName.trim(),
          mode: "insensitive",
        },
        strength: input.strength?.trim() || null,
        form: input.form?.trim() || null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new AppError(
        "An active inventory item with the same medicine, strength and form already exists",
        409,
      );
    }

    const item = await prisma.pharmacyInventoryItem.create({
      data: {
        pharmacyId,
        medicineName: input.medicineName.trim(),
        strength: input.strength?.trim() || null,
        form: input.form?.trim() || null,
        stockUnit: input.stockUnit?.trim() || "pack",
        quantityInStock: input.quantityInStock ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
      },
      select: inventorySelect,
    });

    return {
      item: formatInventoryItem(item),
    };
  },

  async updateInventoryItem(
    pharmacyId: string,
    itemId: string,
    input: UpdatePharmacyInventoryItemInput,
  ) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getInventoryItem(pharmacyId, itemId);

    if (!current.isActive) {
      throw new AppError("Archived inventory items must be restored before editing", 409);
    }

    if (
      input.quantityInStock !== undefined &&
      input.quantityInStock < current.reservedQuantity
    ) {
      throw new AppError(
        `Stock quantity cannot be lower than the reserved quantity (${current.reservedQuantity})`,
        409,
      );
    }

    const item = await prisma.pharmacyInventoryItem.update({
      where: {
        id: itemId,
      },
      data: {
        ...(input.medicineName !== undefined
          ? { medicineName: input.medicineName.trim() }
          : {}),
        ...(input.strength !== undefined
          ? { strength: input.strength?.trim() || null }
          : {}),
        ...(input.form !== undefined
          ? { form: input.form?.trim() || null }
          : {}),
        ...(input.stockUnit !== undefined
          ? { stockUnit: input.stockUnit.trim() }
          : {}),
        ...(input.quantityInStock !== undefined
          ? { quantityInStock: input.quantityInStock }
          : {}),
        ...(input.lowStockThreshold !== undefined
          ? { lowStockThreshold: input.lowStockThreshold }
          : {}),
      },
      select: inventorySelect,
    });

    return {
      item: formatInventoryItem(item),
    };
  },

  async archiveInventoryItem(pharmacyId: string, itemId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getInventoryItem(pharmacyId, itemId);

    if (!current.isActive) {
      throw new AppError("Inventory item is already archived", 409);
    }

    if (current.reservedQuantity > 0) {
      throw new AppError(
        "Inventory item cannot be archived while stock is reserved for active orders",
        409,
      );
    }

    const item = await prisma.pharmacyInventoryItem.update({
      where: {
        id: itemId,
      },
      data: {
        isActive: false,
      },
      select: inventorySelect,
    });

    return {
      item: formatInventoryItem(item),
    };
  },

  async restoreInventoryItem(pharmacyId: string, itemId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getInventoryItem(pharmacyId, itemId);

    if (current.isActive) {
      throw new AppError("Inventory item is already active", 409);
    }

    const item = await prisma.pharmacyInventoryItem.update({
      where: {
        id: itemId,
      },
      data: {
        isActive: true,
      },
      select: inventorySelect,
    });

    return {
      item: formatInventoryItem(item),
    };
  },
};
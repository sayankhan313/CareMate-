import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import type {
  CreatePharmacyInventoryItemInput,
  PharmacyInventoryItem,
  PharmacyInventoryListResponse,
  PharmacyInventoryReferencePrice,
  UpdatePharmacyInventoryItemInput,
} from "./pharmacy-inventory.types.js";

const inventorySelect = {
  id: true,
  medicineName: true,
  strength: true,
  form: true,
  stockUnit: true,
  packSize: true,
  contentUnit: true,
  unitPricePence: true,
  quantityInStock: true,
  reservedQuantity: true,
  lowStockThreshold: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type InventoryRecord = {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  packSize: number | null;
  contentUnit: string | null;
  unitPricePence: number;
  quantityInStock: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeStrength = (value?: string | null) =>
  value?.normalize("NFKD").toLowerCase().replace(/µg/g, "mcg").replace(/\bug\b/g, "mcg").replace(/\s+/g, "").trim() || null;

const extractStrength = (value: string) => {
  const normalized = value.normalize("NFKD").toLowerCase().replace(/µg/g, "mcg").replace(/\bug\b/g, "mcg");
  const matches = normalized.match(/\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l))?/g);
  return matches?.length ? normalizeStrength(matches.join("+")) : null;
};

const normalizeName = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/µg/g, "mcg")
    .replace(/\bug\b/g, "mcg")
    .replace(/\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l))?/g, " ")
    .replace(/\b(tablets?|capsules?|caps?|syrup|gel|cream|ointment|inhaler|spray|drops?|patches?|sachets?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findReference = async (medicineName: string, strength?: string | null) => {
  const references = await prisma.medicinePackReference.findMany({
    where: { isActive: true, defaultUnitPricePence: { gt: 0 } },
    select: {
      id: true,
      medicineName: true,
      strength: true,
      form: true,
      packageUnit: true,
      packSize: true,
      contentUnit: true,
      defaultUnitPricePence: true,
    },
  });

  const nameKey = normalizeName(medicineName);
  const strengthKey = normalizeStrength(strength) || extractStrength(medicineName);
  let candidates = references.filter(reference => normalizeName(reference.medicineName) === nameKey);

  if (strengthKey) {
    const exactStrength = candidates.filter(reference => normalizeStrength(reference.strength) === strengthKey);
    if (exactStrength.length === 1) return exactStrength[0];
    if (exactStrength.length > 0) candidates = exactStrength;
  }

  const exactRawName = candidates.filter(reference => reference.medicineName.trim().toLowerCase() === medicineName.trim().toLowerCase());
  if (exactRawName.length === 1) return exactRawName[0];

  return candidates.length === 1 ? candidates[0] : null;
};

const formatInventoryItem = (item: InventoryRecord): PharmacyInventoryItem => {
  const availableQuantity = Math.max(item.quantityInStock - item.reservedQuantity, 0);
  return { ...item, availableQuantity, isLowStock: availableQuantity <= item.lowStockThreshold };
};

const getInventoryItem = async (pharmacyId: string, itemId: string) => {
  const item = await prisma.pharmacyInventoryItem.findFirst({ where: { id: itemId, pharmacyId }, select: inventorySelect });
  if (!item) throw new AppError("Inventory item not found for this pharmacy", 404);
  return item;
};

export const pharmacyInventoryService = {
  async listInventory(
    pharmacyId: string,
    options: { search?: string; lowStock?: boolean; active: boolean; limit: number },
  ): Promise<PharmacyInventoryListResponse> {
    await ensureApprovedPharmacy(pharmacyId);

    const items = await prisma.pharmacyInventoryItem.findMany({
      where: {
        pharmacyId,
        isActive: options.active,
        ...(options.search ? { medicineName: { contains: options.search, mode: "insensitive" } } : {}),
      },
      select: inventorySelect,
      orderBy: [{ medicineName: "asc" }, { strength: "asc" }],
      take: options.limit,
    });

    const formatted = items.map(formatInventoryItem);
    const filtered = options.lowStock === undefined ? formatted : formatted.filter(item => item.isLowStock === options.lowStock);

    return {
      total: filtered.length,
      lowStockCount: formatted.filter(item => item.isLowStock).length,
      items: filtered,
    };
  },

  async getReferencePrice(pharmacyId: string, medicineName: string, strength?: string): Promise<PharmacyInventoryReferencePrice> {
    await ensureApprovedPharmacy(pharmacyId);

    const reference = await findReference(medicineName, strength);

    if (!reference) return { found: false, reference: null };

    return {
      found: true,
      reference: {
        id: reference.id,
        medicineName: reference.medicineName,
        strength: reference.strength,
        form: reference.form,
        stockUnit: reference.packageUnit,
        defaultUnitPricePence: reference.defaultUnitPricePence,
      },
    };
  },

  async createInventoryItem(pharmacyId: string, input: CreatePharmacyInventoryItemInput) {
    await ensureApprovedPharmacy(pharmacyId);

    const medicineName = input.medicineName.trim();
    const strength = input.strength?.trim() || null;
    const form = input.form?.trim() || null;

    const duplicate = await prisma.pharmacyInventoryItem.findFirst({
      where: {
        pharmacyId,
        medicineName: { equals: medicineName, mode: "insensitive" },
        strength,
        form,
        isActive: true,
      },
      select: { id: true },
    });

    if (duplicate) throw new AppError("An active inventory item with the same medicine, strength and form already exists", 409);

    const reference = await findReference(medicineName, strength);
    const unitPricePence = input.unitPricePence ?? reference?.defaultUnitPricePence ?? 0;

    if (unitPricePence <= 0) {
      throw new AppError("No default price is available for this medicine. Enter the pharmacy selling price manually.", 400);
    }

    const item = await prisma.pharmacyInventoryItem.create({
      data: {
        pharmacyId,
        medicineName,
        strength: strength || reference?.strength || null,
        form: form || reference?.form || null,
        stockUnit: input.stockUnit?.trim() || reference?.packageUnit || "pack",
        packSize: input.packSize ?? reference?.packSize ?? null,
        contentUnit: input.contentUnit?.trim() || reference?.contentUnit || null,
        unitPricePence,
        quantityInStock: input.quantityInStock ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
      },
      select: inventorySelect,
    });

    return { item: formatInventoryItem(item) };
  },

  async updateInventoryItem(pharmacyId: string, itemId: string, input: UpdatePharmacyInventoryItemInput) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getInventoryItem(pharmacyId, itemId);

    if (!current.isActive) throw new AppError("Archived inventory items must be restored before editing", 409);

    if (input.quantityInStock !== undefined && input.quantityInStock < current.reservedQuantity) {
      throw new AppError(`Stock quantity cannot be lower than the reserved quantity (${current.reservedQuantity})`, 409);
    }

    const item = await prisma.pharmacyInventoryItem.update({
      where: { id: itemId },
      data: {
        ...(input.medicineName !== undefined ? { medicineName: input.medicineName.trim() } : {}),
        ...(input.strength !== undefined ? { strength: input.strength?.trim() || null } : {}),
        ...(input.form !== undefined ? { form: input.form?.trim() || null } : {}),
        ...(input.stockUnit !== undefined ? { stockUnit: input.stockUnit.trim() } : {}),
        ...(input.packSize !== undefined ? { packSize: input.packSize } : {}),
        ...(input.contentUnit !== undefined ? { contentUnit: input.contentUnit?.trim() || null } : {}),
        ...(input.unitPricePence !== undefined ? { unitPricePence: input.unitPricePence } : {}),
        ...(input.quantityInStock !== undefined ? { quantityInStock: input.quantityInStock } : {}),
        ...(input.lowStockThreshold !== undefined ? { lowStockThreshold: input.lowStockThreshold } : {}),
      },
      select: inventorySelect,
    });

    return { item: formatInventoryItem(item) };
  },

  async archiveInventoryItem(pharmacyId: string, itemId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getInventoryItem(pharmacyId, itemId);

    if (!current.isActive) throw new AppError("Inventory item is already archived", 409);
    if (current.reservedQuantity > 0) throw new AppError("Inventory item cannot be archived while stock is reserved for active orders", 409);

    const item = await prisma.pharmacyInventoryItem.update({
      where: { id: itemId },
      data: { isActive: false },
      select: inventorySelect,
    });

    return { item: formatInventoryItem(item) };
  },

  async restoreInventoryItem(pharmacyId: string, itemId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getInventoryItem(pharmacyId, itemId);

    if (current.isActive) throw new AppError("Inventory item is already active", 409);

    const item = await prisma.pharmacyInventoryItem.update({
      where: { id: itemId },
      data: { isActive: true },
      select: inventorySelect,
    });

    return { item: formatInventoryItem(item) };
  },
};
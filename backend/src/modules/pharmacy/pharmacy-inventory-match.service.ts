import type { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import { pharmacyPackReferenceService } from "./pharmacy-pack-reference.service.js";

import type {
  ConfirmPharmacyInventoryMatchInput,
  InventoryCandidateComparison,
  PharmacyInventoryCandidatesResponse,
  PharmacyInventoryMatchCandidate,
} from "./pharmacy-inventory-match.types.js";

const TERMINAL_ORDER_STATUSES = new Set(["REJECTED", "DELIVERED", "COLLECTED", "CANCELLED"]);
const LOCKED_FOR_REMATCH_STATUSES = new Set(["READY", "OUT_FOR_DELIVERY", "DELIVERED", "COLLECTED", "REJECTED", "CANCELLED"]);

const FORM_ALIASES: Record<string, string> = {
  tablet: "tablet",
  tablets: "tablet",
  tab: "tablet",
  tabs: "tablet",
  capsule: "capsule",
  capsules: "capsule",
  cap: "capsule",
  caps: "capsule",
  syrup: "syrup",
  suspension: "suspension",
  solution: "solution",
  cream: "cream",
  ointment: "ointment",
  gel: "gel",
  inhaler: "inhaler",
  spray: "spray",
  drops: "drops",
  drop: "drops",
  patch: "patch",
  patches: "patch",
  sachet: "sachet",
  sachets: "sachet",
};

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();
const normalizePackageUnit = (value: string) => value.trim().toLowerCase().replace(/ies$/, "y").replace(/s$/, "");

const normalizeName = (value: string) =>
  normalizeSpaces(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[()[\]{},.;:]/g, " ")
      .replace(/[–—-]/g, " ")
      .replace(/\b\d+(?:\.\d+)?\s*(?:mcg|µg|ug|mg|g|ml|l|%)\b/gi, " ")
      .replace(/\b(tablets?|tabs?|capsules?|caps?|syrup|suspension|solution|cream|ointment|gel|inhaler|spray|drops?|patches?|sachets?)\b/gi, " ")
      .replace(/[^a-z0-9\s/+]/g, " "),
  );

const normalizeStrength = (value?: string | null) => {
  if (!value) return null;

  const normalized = value.normalize("NFKD").toLowerCase().replace(/µg/g, "mcg").replace(/\bug\b/g, "mcg").replace(/[–—-]/g, " ");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|ml|l|%)\b/i);

  if (!match) return null;

  const number = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(number)) return null;
  if (unit === "g") return `${number * 1000}mg`;
  if (unit === "l") return `${number * 1000}ml`;

  return `${number}${unit}`;
};

const extractStrength = (name: string, dose?: string | null) => normalizeStrength(dose) || normalizeStrength(name);

const normalizeForm = (value?: string | null) => {
  if (!value) return null;

  const tokens = value.toLowerCase().match(/[a-z]+/g) || [];

  for (const token of tokens) {
    if (FORM_ALIASES[token]) return FORM_ALIASES[token];
  }

  return normalizeSpaces(value.toLowerCase()) || null;
};

const extractForm = (name: string, dose?: string | null) => {
  const tokens = `${name} ${dose || ""}`.toLowerCase().match(/[a-z]+/g) || [];

  for (const token of tokens) {
    if (FORM_ALIASES[token]) return FORM_ALIASES[token];
  }

  return null;
};

const parseSuggestedQuantity = (value?: string | null) => {
  if (!value) return null;

  const match = value.trim().match(/^(\d+)(?:\s+[a-zA-Z]+)?$/);
  if (!match) return null;

  const quantity = Number(match[1]);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
};

const compareOptional = (source: string | null, inventory: string | null): InventoryCandidateComparison => {
  if (!source) return "MISSING_SOURCE";
  if (!inventory) return "MISSING_INVENTORY";
  return source === inventory ? "MATCH" : "MISMATCH";
};

const damerauLevenshteinDistance = (left: string, right: string) => {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );

      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost);
      }
    }
  }

  return matrix[left.length][right.length];
};

const getNameSimilarity = (left: string, right: string) => {
  if (!left || !right) return 0;
  if (left === right) return 1;

  const longestLength = Math.max(left.length, right.length);
  const distance = damerauLevenshteinDistance(left, right);

  return Math.max(0, 1 - distance / longestLength);
};

const getSafeFuzzySimilarity = (left: string, right: string) => {
  if (!left || !right) return null;
  if (left === right) return 1;

  const shortestLength = Math.min(left.length, right.length);
  const longestLength = Math.max(left.length, right.length);

  if (shortestLength < 5) return null;
  if (left[0] !== right[0]) return null;

  const distance = damerauLevenshteinDistance(left, right);
  const maxDistance = longestLength <= 7 ? 1 : 2;
  const similarity = getNameSimilarity(left, right);

  if (distance > maxDistance || similarity < 0.84) return null;

  return similarity;
};

const getMedicineReferenceNames = async (sourceName: string) => {
  const normalizedSource = normalizeName(sourceName);
  if (!normalizedSource) return new Set<string>();

  const references = await prisma.medicineReference.findMany({
    where: { isActive: true },
    select: { brandName: true, genericName: true, aliases: true },
  });

  const referenceMatches = references
    .map(reference => {
      const names = [reference.brandName, reference.genericName, ...reference.aliases].map(normalizeName).filter(Boolean);

      if (names.includes(normalizedSource)) {
        return { reference, similarity: 1, exact: true };
      }

      const fuzzySimilarities = names
        .map(name => getSafeFuzzySimilarity(normalizedSource, name))
        .filter((value): value is number => value !== null);

      return {
        reference,
        similarity: fuzzySimilarities.length > 0 ? Math.max(...fuzzySimilarities) : 0,
        exact: false,
      };
    })
    .filter(match => match.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity);

  const best = referenceMatches[0];
  const second = referenceMatches[1];

  if (!best) return new Set([normalizedSource]);

  const safelyUniqueFuzzyReference = !best.exact && best.similarity >= 0.88 && (!second || best.similarity - second.similarity >= 0.05);

  if (!best.exact && !safelyUniqueFuzzyReference) return new Set([normalizedSource]);

  return new Set(
    [best.reference.brandName, best.reference.genericName, ...best.reference.aliases, sourceName]
      .map(normalizeName)
      .filter(Boolean),
  );
};

const getNameMatch = (inventoryName: string, sourceName: string, acceptedNames: Set<string>) => {
  const normalizedInventory = normalizeName(inventoryName);
  const normalizedSource = normalizeName(sourceName);

  if (!normalizedInventory || !normalizedSource) return null;

  if (normalizedInventory === normalizedSource) {
    return { type: "EXACT" as const, score: 60, confidence: 1 };
  }

  if (acceptedNames.has(normalizedInventory)) {
    return { type: "ALIAS" as const, score: 55, confidence: 1 };
  }

  const possibleNames = Array.from(new Set([normalizedSource, ...acceptedNames]));
  const fuzzyMatches = possibleNames
    .map(candidateName => ({
      candidateName,
      similarity: getSafeFuzzySimilarity(normalizedInventory, candidateName),
    }))
    .filter((candidate): candidate is { candidateName: string; similarity: number } => candidate.similarity !== null)
    .sort((a, b) => b.similarity - a.similarity);

  if (fuzzyMatches.length > 0) {
    return { type: "FUZZY" as const, score: 44, confidence: fuzzyMatches[0].similarity };
  }

  const shorterLength = Math.min(normalizedInventory.length, normalizedSource.length);
  const longerLength = Math.max(normalizedInventory.length, normalizedSource.length);
  const lengthRatio = longerLength > 0 ? shorterLength / longerLength : 0;

  if (
    shorterLength >= 5 &&
    lengthRatio >= 0.65 &&
    (normalizedInventory.includes(normalizedSource) || normalizedSource.includes(normalizedInventory))
  ) {
    return { type: "PARTIAL" as const, score: 30, confidence: lengthRatio };
  }

  return null;
};

const buildCandidate = (
  inventory: {
    id: string;
    medicineName: string;
    strength: string | null;
    form: string | null;
    stockUnit: string;
    unitPricePence: number;
    quantityInStock: number;
    reservedQuantity: number;
    lowStockThreshold: number;
  },
  source: { name: string; strength: string | null; form: string | null },
  acceptedNames: Set<string>,
): (PharmacyInventoryMatchCandidate & { score: number }) | null => {
  const nameMatch = getNameMatch(inventory.medicineName, source.name, acceptedNames);
  if (!nameMatch) return null;

  const inventoryStrength = normalizeStrength(inventory.strength);
  const inventoryForm = normalizeForm(inventory.form);
  const strengthMatch = compareOptional(source.strength, inventoryStrength);
  const formMatch = compareOptional(source.form, inventoryForm);
  const reasons: string[] = [];
  let score = nameMatch.score;

  if (nameMatch.type === "FUZZY") {
    reasons.push(
      `Medicine name is a likely spelling/OCR variation (${Math.round(nameMatch.confidence * 100)}% similarity). Pharmacist confirmation is required.`,
    );
  } else if (nameMatch.type === "PARTIAL") {
    reasons.push("Medicine name only partially matches the inventory record. Pharmacist confirmation is required.");
  } else if (nameMatch.type === "ALIAS") {
    reasons.push("Medicine name matched a known brand/generic/alias reference.");
  }

  if (strengthMatch === "MATCH") {
    score += 25;
  } else if (strengthMatch === "MISMATCH") {
    score -= 20;
    reasons.push("Strength differs from the prescription/order data.");
  } else if (strengthMatch === "MISSING_SOURCE") {
    reasons.push("Strength is missing from the prescription/order data.");
  } else {
    reasons.push("Inventory strength is not recorded.");
  }

  if (formMatch === "MATCH") {
    score += 15;
  } else if (formMatch === "MISMATCH") {
    score -= 10;
    reasons.push("Medicine form differs from the prescription/order data.");
  } else if (formMatch === "MISSING_SOURCE") {
    reasons.push("Medicine form is missing from the prescription/order data.");
  } else {
    reasons.push("Inventory medicine form is not recorded.");
  }

  const availableQuantity = Math.max(inventory.quantityInStock - inventory.reservedQuantity, 0);
  const strongMedicineIdentity = nameMatch.type === "EXACT" || nameMatch.type === "ALIAS";

  const matchQuality =
    strongMedicineIdentity && strengthMatch === "MATCH" && formMatch === "MATCH"
      ? "EXACT"
      : strengthMatch === "MISMATCH" || formMatch === "MISMATCH"
        ? "POSSIBLE"
        : "REVIEW_REQUIRED";

  if (availableQuantity === 0) reasons.push("No currently available stock.");

  return {
    id: inventory.id,
    medicineName: inventory.medicineName,
    strength: inventory.strength,
    form: inventory.form,
    stockUnit: inventory.stockUnit,
    unitPricePence: inventory.unitPricePence,
    quantityInStock: inventory.quantityInStock,
    reservedQuantity: inventory.reservedQuantity,
    availableQuantity,
    lowStockThreshold: inventory.lowStockThreshold,
    isLowStock: availableQuantity <= inventory.lowStockThreshold,
    nameMatchedBy: nameMatch.type,
    nameMatchConfidence: Number(nameMatch.confidence.toFixed(3)),
    strengthMatch,
    formMatch,
    matchQuality,
    packageReference: null,
    reasons,
    score,
  };
};

const getOrderItemForPharmacy = async (pharmacyId: string, orderId: string, orderItemId: string) => {
  const order = await prisma.medicineOrder.findFirst({
    where: { id: orderId, pharmacyId },
    select: {
      id: true,
      status: true,
      payment: { select: { status: true } },
      items: {
        where: { id: orderItemId },
        select: {
          id: true,
          name: true,
          dose: true,
          quantity: true,
          quantityUnit: true,
          unitPricePence: true,
          lineTotalPence: true,
          dispensedQuantity: true,
          dispensedUnit: true,
          inventoryItemId: true,
          inventoryReservedQuantity: true,
          inventoryReservedAt: true,
          inventoryConsumedAt: true,
          inventoryReleasedAt: true,
        },
      },
    },
  });

  if (!order) throw new AppError("Order not found for this pharmacy", 404);

  const item = order.items[0];
  if (!item) throw new AppError("Order medicine item not found", 404);

  return { order, item };
};

const getActiveReservations = async (tx: Prisma.TransactionClient, pharmacyId: string, orderId: string) =>
  tx.medicineOrderItem.findMany({
    where: {
      orderId,
      inventoryItemId: { not: null },
      inventoryReservedQuantity: { gt: 0 },
      inventoryReservedAt: { not: null },
      inventoryConsumedAt: null,
      inventoryReleasedAt: null,
      inventoryItem: { is: { pharmacyId } },
    },
    select: { id: true, inventoryItemId: true, inventoryReservedQuantity: true },
  });

const recalculateOrderPricing = async (tx: Prisma.TransactionClient, orderId: string) => {
  const items = await tx.medicineOrderItem.findMany({
    where: { orderId },
    select: { unitPricePence: true, lineTotalPence: true },
  });

  const pricingComplete =
    items.length > 0 &&
    items.every(
      item =>
        item.unitPricePence !== null &&
        item.unitPricePence > 0 &&
        item.lineTotalPence !== null &&
        item.lineTotalPence > 0,
    );

  const calculatedAmountPence = pricingComplete
    ? items.reduce((total, item) => total + (item.lineTotalPence || 0), 0)
    : 0;

  const payment = await tx.prescriptionPayment.findUnique({
    where: { orderId },
    select: {
      id: true,
      chargePreference: true,
      status: true,
      amountPence: true,
      currency: true,
    },
  });

  if (!payment) {
    return { orderAmountPence: calculatedAmountPence, pricingComplete, currency: "GBP" };
  }

  const paymentNotRequired = payment.status === "NOT_REQUIRED";

  if (paymentNotRequired) {
    if (payment.amountPence !== 0) {
      await tx.prescriptionPayment.update({
        where: { id: payment.id },
        data: {
          chargeableItemCount: 0,
          unitChargePence: 0,
          amountPence: 0,
        },
      });
    }

    return { orderAmountPence: 0, pricingComplete, currency: payment.currency };
  }

  if (payment.status !== "PAID" && payment.status !== "REFUNDED") {
    await tx.prescriptionPayment.update({
      where: { id: payment.id },
      data: {
        chargeableItemCount: items.length,
        unitChargePence: 0,
        amountPence: calculatedAmountPence,
      },
    });
  }

  return {
    orderAmountPence:
      payment.status === "PAID" || payment.status === "REFUNDED"
        ? payment.amountPence
        : calculatedAmountPence,
    pricingComplete,
    currency: payment.currency,
  };
};

export const ensureOrderInventoryReadyForFulfilment = async (
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  orderId: string,
) => {
  const items = await tx.medicineOrderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      unitPricePence: true,
      lineTotalPence: true,
      dispensedQuantity: true,
      dispensedUnit: true,
      inventoryItemId: true,
      inventoryReservedQuantity: true,
      inventoryReservedAt: true,
      inventoryConsumedAt: true,
      inventoryReleasedAt: true,
      inventoryItem: {
        select: {
          pharmacyId: true,
          isActive: true,
        },
      },
    },
  });

  if (items.length === 0) return;

  const notReady = items.filter(
    item =>
      !item.unitPricePence ||
      item.unitPricePence <= 0 ||
      !item.lineTotalPence ||
      item.lineTotalPence <= 0 ||
      !item.inventoryItemId ||
      !item.inventoryItem ||
      item.inventoryItem.pharmacyId !== pharmacyId ||
      !item.inventoryItem.isActive ||
      item.inventoryReservedQuantity <= 0 ||
      !item.inventoryReservedAt ||
      item.inventoryConsumedAt !== null ||
      item.inventoryReleasedAt !== null ||
      !item.dispensedQuantity ||
      item.dispensedQuantity <= 0 ||
      !item.dispensedUnit,
  );

  if (notReady.length > 0) {
    throw new AppError(
      `Match and reserve pharmacy stock for all medicines before continuing fulfilment (${notReady.length} item${notReady.length === 1 ? "" : "s"} remaining).`,
      409,
    );
  }
};

export const releaseOrderInventoryReservations = async (
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  orderId: string,
  now = new Date(),
) => {
  const reservations = await getActiveReservations(tx, pharmacyId, orderId);

  for (const reservation of reservations) {
    if (!reservation.inventoryItemId) continue;

    const released = await tx.pharmacyInventoryItem.updateMany({
      where: {
        id: reservation.inventoryItemId,
        pharmacyId,
        reservedQuantity: { gte: reservation.inventoryReservedQuantity },
      },
      data: {
        reservedQuantity: { decrement: reservation.inventoryReservedQuantity },
      },
    });

    if (released.count === 0) {
      throw new AppError("Inventory reservation changed elsewhere. Please refresh and try again.", 409);
    }

    await tx.medicineOrderItem.update({
      where: { id: reservation.id },
      data: {
        inventoryReleasedAt: now,
        dispensedQuantity: null,
        dispensedUnit: null,
      },
    });
  }
};

export const consumeOrderInventoryReservations = async (
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  orderId: string,
  now = new Date(),
) => {
  const reservations = await getActiveReservations(tx, pharmacyId, orderId);

  for (const reservation of reservations) {
    if (!reservation.inventoryItemId) continue;

    const consumed = await tx.pharmacyInventoryItem.updateMany({
      where: {
        id: reservation.inventoryItemId,
        pharmacyId,
        quantityInStock: { gte: reservation.inventoryReservedQuantity },
        reservedQuantity: { gte: reservation.inventoryReservedQuantity },
      },
      data: {
        quantityInStock: { decrement: reservation.inventoryReservedQuantity },
        reservedQuantity: { decrement: reservation.inventoryReservedQuantity },
      },
    });

    if (consumed.count === 0) {
      throw new AppError("Reserved stock is no longer available. Please refresh the order.", 409);
    }

    await tx.medicineOrderItem.update({
      where: { id: reservation.id },
      data: { inventoryConsumedAt: now },
    });
  }
};

export const pharmacyInventoryMatchService = {
  async getCandidates(
    pharmacyId: string,
    orderId: string,
    orderItemId: string,
  ): Promise<PharmacyInventoryCandidatesResponse> {
    await ensureApprovedPharmacy(pharmacyId);

    const { item } = await getOrderItemForPharmacy(pharmacyId, orderId, orderItemId);
    const sourceStrength = extractStrength(item.name, item.dose);
    const sourceForm = extractForm(item.name, item.dose);
    const acceptedNames = await getMedicineReferenceNames(item.name);

    const inventoryItems = await prisma.pharmacyInventoryItem.findMany({
      where: { pharmacyId, isActive: true },
      select: {
        id: true,
        medicineName: true,
        strength: true,
        form: true,
        stockUnit: true,
        unitPricePence: true,
        quantityInStock: true,
        reservedQuantity: true,
        lowStockThreshold: true,
      },
      orderBy: { medicineName: "asc" },
      take: 250,
    });

    const candidates = inventoryItems
      .map(inventory =>
        buildCandidate(
          inventory,
          {
            name: item.name,
            strength: sourceStrength,
            form: sourceForm,
          },
          acceptedNames,
        ),
      )
      .filter(
        (candidate): candidate is PharmacyInventoryMatchCandidate & { score: number } =>
          candidate !== null,
      )
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.availableQuantity - a.availableQuantity;
      });

    const candidatesWithPackaging = await Promise.all(
      candidates.map(async candidate => {
        if (!candidate.strength) {
          return { ...candidate, packageReference: null };
        }

        try {
          const pack = await pharmacyPackReferenceService.findPackReference(
            candidate.medicineName,
            candidate.strength,
          );

          if (!pack) return { ...candidate, packageReference: null };

          return {
            ...candidate,
            packageReference: {
              packageUnit: pack.packageUnit,
              packSize: pack.packSize,
              contentUnit: pack.contentUnit,
            },
          };
        } catch {
          return { ...candidate, packageReference: null };
        }
      }),
    );

    const exactCandidates = candidatesWithPackaging.filter(
      candidate =>
        candidate.matchQuality === "EXACT" &&
        candidate.availableQuantity > 0 &&
        candidate.packageReference !== null &&
        candidate.unitPricePence > 0,
    );

    const suggestedCandidateId = exactCandidates.length === 1 ? exactCandidates[0].id : null;

    return {
      orderItem: item,
      extracted: {
        medicineName: item.name,
        strength: sourceStrength,
        form: sourceForm,
        suggestedReserveQuantity: parseSuggestedQuantity(item.quantity),
      },
      suggestedCandidateId,
      requiresPharmacistConfirmation: true,
      candidates: candidatesWithPackaging.map(({ score: _score, ...candidate }) => candidate),
    };
  },

  async confirmMatchAndReserve(
    pharmacyId: string,
    orderId: string,
    orderItemId: string,
    input: ConfirmPharmacyInventoryMatchInput,
  ) {
    await ensureApprovedPharmacy(pharmacyId);

    const { order, item: sourceItem } = await getOrderItemForPharmacy(
      pharmacyId,
      orderId,
      orderItemId,
    );

    const sourceStrength = extractStrength(sourceItem.name, sourceItem.dose);
    const sourceForm = extractForm(sourceItem.name, sourceItem.dose);
    const acceptedNames = await getMedicineReferenceNames(sourceItem.name);

    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      throw new AppError("Inventory cannot be changed for a completed or closed order.", 409);
    }

    if (LOCKED_FOR_REMATCH_STATUSES.has(order.status)) {
      throw new AppError("Inventory matching must be completed before the order reaches this fulfilment stage.", 409);
    }

    if (order.payment?.status === "PAID" || order.payment?.status === "REFUNDED") {
      throw new AppError("Stock pricing cannot be changed after payment has been completed.", 409);
    }

    return prisma.$transaction(
      async tx => {
        const item = await tx.medicineOrderItem.findFirst({
          where: { id: orderItemId, orderId },
          select: {
            id: true,
            inventoryItemId: true,
            inventoryReservedQuantity: true,
            inventoryReservedAt: true,
            inventoryConsumedAt: true,
            inventoryReleasedAt: true,
          },
        });

        if (!item) throw new AppError("Order medicine item not found", 404);
        if (item.inventoryConsumedAt) throw new AppError("Consumed inventory cannot be rematched.", 409);

        const inventory = await tx.pharmacyInventoryItem.findFirst({
          where: {
            id: input.inventoryItemId,
            pharmacyId,
            isActive: true,
          },
          select: {
            id: true,
            medicineName: true,
            strength: true,
            form: true,
            stockUnit: true,
            unitPricePence: true,
            quantityInStock: true,
            reservedQuantity: true,
            lowStockThreshold: true,
          },
        });

        if (!inventory) {
          throw new AppError("Selected inventory item is unavailable for this pharmacy.", 404);
        }

        if (inventory.unitPricePence <= 0) {
          throw new AppError("Set a valid medicine price in inventory before matching this stock.", 409);
        }

        const selectedCandidate = buildCandidate(
          inventory,
          {
            name: sourceItem.name,
            strength: sourceStrength,
            form: sourceForm,
          },
          acceptedNames,
        );

        if (!selectedCandidate) {
          throw new AppError("Selected stock item does not match this medicine name.", 409);
        }

        if (selectedCandidate.strengthMatch === "MISMATCH") {
          throw new AppError("Selected stock strength conflicts with the detected/prescribed strength.", 409);
        }

        if (selectedCandidate.formMatch === "MISMATCH") {
          throw new AppError("Selected stock form conflicts with the detected/prescribed medicine form.", 409);
        }

        if (!inventory.strength) {
          throw new AppError("Inventory strength is required to calculate pack contents.", 409);
        }

        const dispensing = await pharmacyPackReferenceService.calculateDispensedQuantity({
          medicineName: inventory.medicineName,
          strength: inventory.strength,
          packageQuantity: input.quantity,
        });

        if (normalizePackageUnit(inventory.stockUnit) !== normalizePackageUnit(dispensing.packageUnit)) {
          throw new AppError(
            `Inventory stock unit is '${inventory.stockUnit}', but this medicine reference uses '${dispensing.packageUnit}'. Update the inventory stock unit before continuing.`,
            409,
          );
        }

        const oldReservationIsActive =
          !!item.inventoryItemId &&
          item.inventoryReservedQuantity > 0 &&
          !!item.inventoryReservedAt &&
          !item.inventoryReleasedAt;

        if (oldReservationIsActive && item.inventoryItemId) {
          const released = await tx.pharmacyInventoryItem.updateMany({
            where: {
              id: item.inventoryItemId,
              pharmacyId,
              reservedQuantity: { gte: item.inventoryReservedQuantity },
            },
            data: {
              reservedQuantity: { decrement: item.inventoryReservedQuantity },
            },
          });

          if (released.count === 0) {
            throw new AppError("Existing stock reservation changed elsewhere. Please refresh and try again.", 409);
          }
        }

        const refreshedInventory = await tx.pharmacyInventoryItem.findUnique({
          where: { id: inventory.id },
          select: {
            id: true,
            quantityInStock: true,
            reservedQuantity: true,
          },
        });

        if (!refreshedInventory) {
          throw new AppError("Selected inventory item no longer exists.", 404);
        }

        const availableQuantity = Math.max(
          refreshedInventory.quantityInStock - refreshedInventory.reservedQuantity,
          0,
        );

        if (availableQuantity < input.quantity) {
          throw new AppError(
            `Only ${availableQuantity} ${inventory.stockUnit}${availableQuantity === 1 ? "" : "s"} currently available.`,
            409,
          );
        }

        await tx.pharmacyInventoryItem.update({
          where: { id: inventory.id },
          data: {
            reservedQuantity: { increment: input.quantity },
          },
        });

        const now = new Date();
        const unitPricePence = inventory.unitPricePence;
        const lineTotalPence = unitPricePence * input.quantity;

        const updatedItem = await tx.medicineOrderItem.update({
          where: { id: item.id },
          data: {
            inventoryItemId: inventory.id,
            inventoryReservedQuantity: input.quantity,
            inventoryReservedAt: now,
            inventoryConsumedAt: null,
            inventoryReleasedAt: null,
            unitPricePence,
            lineTotalPence,
            dispensedQuantity: dispensing.dispensedQuantity,
            dispensedUnit: dispensing.contentUnit,
          },
          select: {
            id: true,
            name: true,
            dose: true,
            quantity: true,
            quantityUnit: true,
            unitPricePence: true,
            lineTotalPence: true,
            dispensedQuantity: true,
            dispensedUnit: true,
            inventoryItemId: true,
            inventoryReservedQuantity: true,
            inventoryReservedAt: true,
            inventoryConsumedAt: true,
            inventoryReleasedAt: true,
            inventoryItem: {
              select: {
                id: true,
                medicineName: true,
                strength: true,
                form: true,
                stockUnit: true,
                unitPricePence: true,
                quantityInStock: true,
                reservedQuantity: true,
                lowStockThreshold: true,
                isActive: true,
              },
            },
          },
        });

        const pricing = await recalculateOrderPricing(tx, orderId);

        return {
          item: updatedItem,
          dispensing: {
            packages: dispensing.packages,
            packageUnit: dispensing.packageUnit,
            packSize: dispensing.packSize,
            contentUnit: dispensing.contentUnit,
            dispensedQuantity: dispensing.dispensedQuantity,
          },
          pricing: {
            unitPricePence,
            lineTotalPence,
            orderAmountPence: pricing.orderAmountPence,
            pricingComplete: pricing.pricingComplete,
            currency: "GBP",
          },
          availableAfterReservation: availableQuantity - input.quantity,
        };
      },
      { isolationLevel: "Serializable" },
    );
  },

  async releaseMatch(pharmacyId: string, orderId: string, orderItemId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const { order } = await getOrderItemForPharmacy(pharmacyId, orderId, orderItemId);

    if (LOCKED_FOR_REMATCH_STATUSES.has(order.status)) {
      throw new AppError("Inventory reservation cannot be released at this fulfilment stage.", 409);
    }

    if (order.payment?.status === "PAID" || order.payment?.status === "REFUNDED") {
      throw new AppError("Stock pricing cannot be changed after payment has been completed.", 409);
    }

    return prisma.$transaction(
      async tx => {
        const item = await tx.medicineOrderItem.findFirst({
          where: { id: orderItemId, orderId },
          select: {
            id: true,
            inventoryItemId: true,
            inventoryReservedQuantity: true,
            inventoryReservedAt: true,
            inventoryConsumedAt: true,
            inventoryReleasedAt: true,
          },
        });

        if (!item) throw new AppError("Order medicine item not found", 404);
        if (item.inventoryConsumedAt) throw new AppError("Consumed inventory cannot be released.", 409);

        const hasActiveReservation =
          !!item.inventoryItemId &&
          item.inventoryReservedQuantity > 0 &&
          !!item.inventoryReservedAt &&
          !item.inventoryReleasedAt;

        if (!hasActiveReservation || !item.inventoryItemId) {
          throw new AppError("This order item has no active inventory reservation.", 409);
        }

        const released = await tx.pharmacyInventoryItem.updateMany({
          where: {
            id: item.inventoryItemId,
            pharmacyId,
            reservedQuantity: { gte: item.inventoryReservedQuantity },
          },
          data: {
            reservedQuantity: { decrement: item.inventoryReservedQuantity },
          },
        });

        if (released.count === 0) {
          throw new AppError("Inventory reservation changed elsewhere. Please refresh and try again.", 409);
        }

        const updatedItem = await tx.medicineOrderItem.update({
          where: { id: item.id },
          data: {
            inventoryItemId: null,
            inventoryReservedQuantity: 0,
            inventoryReservedAt: null,
            inventoryReleasedAt: new Date(),
            unitPricePence: null,
            lineTotalPence: null,
            dispensedQuantity: null,
            dispensedUnit: null,
          },
          select: {
            id: true,
            name: true,
            unitPricePence: true,
            lineTotalPence: true,
            dispensedQuantity: true,
            dispensedUnit: true,
            inventoryItemId: true,
            inventoryReservedQuantity: true,
            inventoryReservedAt: true,
            inventoryConsumedAt: true,
            inventoryReleasedAt: true,
          },
        });

        const pricing = await recalculateOrderPricing(tx, orderId);

        return {
          item: updatedItem,
          pricing: {
            orderAmountPence: pricing.orderAmountPence,
            pricingComplete: pricing.pricingComplete,
            currency: "GBP",
          },
        };
      },
      { isolationLevel: "Serializable" },
    );
  },
};
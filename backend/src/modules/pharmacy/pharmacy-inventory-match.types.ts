export type InventoryCandidateMatchQuality = "EXACT" | "REVIEW_REQUIRED" | "POSSIBLE";

export type InventoryCandidateComparison =
  | "MATCH"
  | "MISSING_SOURCE"
  | "MISSING_INVENTORY"
  | "MISMATCH";

export type PharmacyInventoryMatchCandidate = {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  quantityInStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  nameMatchedBy: "EXACT" | "ALIAS" | "FUZZY" | "PARTIAL";
  nameMatchConfidence: number;
  strengthMatch: InventoryCandidateComparison;
  formMatch: InventoryCandidateComparison;
  matchQuality: InventoryCandidateMatchQuality;
  reasons: string[];
};

export type PharmacyInventoryCandidatesResponse = {
  orderItem: {
    id: string;
    name: string;
    dose: string | null;
    quantity: string | null;
    quantityUnit: string | null;
    inventoryItemId: string | null;
    inventoryReservedQuantity: number;
    inventoryReservedAt: Date | null;
    inventoryConsumedAt: Date | null;
    inventoryReleasedAt: Date | null;
  };
  extracted: {
    medicineName: string;
    strength: string | null;
    form: string | null;
    suggestedReserveQuantity: number | null;
  };
  suggestedCandidateId: string | null;
  requiresPharmacistConfirmation: true;
  candidates: PharmacyInventoryMatchCandidate[];
};

export type ConfirmPharmacyInventoryMatchInput = {
  inventoryItemId: string;
  quantity: number;
};
export type InventoryCandidateMatchQuality =
  | "EXACT"
  | "REVIEW_REQUIRED"
  | "POSSIBLE";

export type InventoryCandidateComparison =
  | "MATCH"
  | "MISSING_SOURCE"
  | "MISSING_INVENTORY"
  | "MISMATCH";

export type PharmacyPackReferencePreview = {
  packageUnit: string;
  packSize: number;
  contentUnit: string;
};

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

  nameMatchedBy:
    | "EXACT"
    | "ALIAS"
    | "FUZZY"
    | "PARTIAL";

  nameMatchConfidence: number;

  strengthMatch: InventoryCandidateComparison;
  formMatch: InventoryCandidateComparison;

  matchQuality: InventoryCandidateMatchQuality;

  /*
   * Reference packaging only.
   *
   * Example:
   * packageUnit = "pack"
   * packSize = 28
   * contentUnit = "tablet"
   */
  packageReference: PharmacyPackReferencePreview | null;

  reasons: string[];
};

export type PharmacyInventoryCandidatesResponse = {
  orderItem: {
    id: string;
    name: string;
    dose: string | null;

    quantity: string | null;
    quantityUnit: string | null;

    dispensedQuantity: number | null;
    dispensedUnit: string | null;

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

  /*
   * Number of pharmacy stock packages.
   *
   * Example:
   * quantity = 2
   * stockUnit = pack
   */
  quantity: number;
};
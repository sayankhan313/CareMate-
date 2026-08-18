import { API_BASE_URL } from "../../constants/api";
import { getPharmacyAuthHeaders, readPharmacyResponse } from "./pharmacy-api.utils";

export type PharmacyOrderSource =
  | "DOCTOR_PRESCRIPTION"
  | "PATIENT_SUBMISSION"
  | "REFILL_REQUEST"
  | "MANUAL_REQUEST";

export type PharmacyOrderStatus =
  | "RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COLLECTED"
  | "DELAYED"
  | "OUT_OF_STOCK"
  | "CANCELLED";

export type PharmacyPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "NOT_REQUIRED"
  | "REFUNDED";

export type PrescriptionChargePreference =
  | "CHARGEABLE"
  | "EXEMPT"
  | "PPC";

export type PatientRefillVerificationPath =
  | "CAREMATE_PRESCRIPTION"
  | "ASSIGNED_DOCTOR"
  | "EXTERNAL_EVIDENCE";

export type PatientRefillDoctorVerificationStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED";

export type PatientMedicineEvidenceType =
  | "NHS_APP_SCREENSHOT"
  | "EPS_TOKEN"
  | "GP_REPEAT_MEDICATION_RECORD"
  | "HOSPITAL_OR_CLINIC_LETTER"
  | "PHARMACY_LABELLED_MEDICINE"
  | "OTHER";

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
  unitPricePence: number;
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
  packageReference: PharmacyPackReferencePreview | null;
};

export type PharmacyInventoryCandidatesResponse = {
  orderItem: {
    id: string;
    name: string;
    dose: string | null;
    quantity: string | null;
    quantityUnit: string | null;
    unitPricePence: number | null;
    lineTotalPence: number | null;
    dispensedQuantity: number | null;
    dispensedUnit: string | null;
    inventoryItemId: string | null;
    inventoryReservedQuantity: number;
    inventoryReservedAt: string | null;
    inventoryConsumedAt: string | null;
    inventoryReleasedAt: string | null;
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

export type PharmacyOrderListItem = {
  id: string;
  orderNumber: string | null;
  source: PharmacyOrderSource;
  status: PharmacyOrderStatus;
  medicineName: string;
  itemCount: number;
  prescriptionConfirmed: boolean;
  fulfilmentAllowed: boolean;
  createdAt: string;
  updatedAt: string;

  patient: {
    id: string;
    fullName: string;
  };

  doctor: {
    id: string;
    fullName: string;
  } | null;

  payment: {
    chargePreference: PrescriptionChargePreference;
    status: PharmacyPaymentStatus;
    amountPence: number;
    currency: string;
  } | null;
};

export type PharmacyOrderInventoryItem = {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  unitPricePence: number;
  quantityInStock: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type PharmacyPatientSubmission = {
  id: string;
  requestType: string;
  status: string;
  verificationPath: PatientRefillVerificationPath | null;
  doctorVerificationStatus: PatientRefillDoctorVerificationStatus;
  doctorVerificationRequestedAt: string | null;
  doctorVerificationNote: string | null;
  doctorVerifiedAt: string | null;

  verificationDoctor: {
    id: string;
    fullName: string;
  } | null;

  evidenceType: PatientMedicineEvidenceType | null;
  imageUrl: string | null;
  notes: string | null;
  reviewedByPharmacyId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type PharmacyOrderDetail = {
  id: string;
  orderNumber: string | null;
  orderSource: PharmacyOrderSource;
  status: PharmacyOrderStatus;
  statusReason: string | null;

  medicineName: string;
  dose: string | null;
  quantity: string | null;
  instructions: string | null;

  requestedByRole: string | null;
  requestedByName: string | null;
  requestNote: string | null;

  prescriptionConfirmed: boolean;
  prescriptionConfirmedAt: string | null;
  fulfilmentAllowed: boolean;

  acceptedAt: string | null;
  rejectedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  collectedAt: string | null;
  cancelledAt: string | null;
  delayedAt: string | null;
  outOfStockAt: string | null;

  createdAt: string;
  updatedAt: string;

  patient: {
    id: string;
    fullName: string;
    email: string;

    patientProfile: {
      phoneNumber: string | null;
      addressLine: string | null;
      postcode: string | null;
    } | null;
  };

  doctor: {
    id: string;
    fullName: string;

    doctorProfile: {
      specialization: string | null;
    } | null;
  } | null;

  prescription: {
    id: string;
    source: string;
    prescribedAt: string;
    notes: string | null;
  } | null;

  patientSubmission: PharmacyPatientSubmission | null;

  items: {
    id: string;
    medicineId: string | null;
    prescriptionItemId: string | null;
    submissionItemId: string | null;

    name: string;
    dose: string | null;
    quantity: string | null;
    instructions: string | null;

    unitPricePence: number | null;
    lineTotalPence: number | null;

    dispensedQuantity: number | null;
    dispensedUnit: string | null;
    quantityUnit: string | null;

    inventoryItemId: string | null;
    inventoryReservedQuantity: number;
    inventoryReservedAt: string | null;
    inventoryConsumedAt: string | null;
    inventoryReleasedAt: string | null;

    inventoryItem: PharmacyOrderInventoryItem | null;
  }[];

  payment: {
    id: string;
    chargePreference: PrescriptionChargePreference;
    chargeableItemCount: number;
    unitChargePence: number;
    amountPence: number;
    currency: string;
    provider: string | null;
    testMode: boolean;
    status: PharmacyPaymentStatus;
    paidAt: string | null;
    failedAt: string | null;
    refundedAt: string | null;
  } | null;

  exemptionClaim: {
    id: string;
    exemptionType: string;
    referenceNumber: string | null;
    evidenceDocumentUrl: string | null;
    expiresAt: string | null;
    status: string;
    verifiedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
  } | null;

  statusHistory: {
    id: string;
    fromStatus: PharmacyOrderStatus | null;
    toStatus: PharmacyOrderStatus;
    note: string | null;
    createdAt: string;
  }[];
};

export type PharmacyOrderDetailResponse = {
  order: PharmacyOrderDetail;
  allowedNextStatuses: PharmacyOrderStatus[];
};

export const pharmacyOrdersApi = {
  async getOrders(options?: {
    source?: PharmacyOrderSource;
    status?: PharmacyOrderStatus;
    limit?: number;
  }) {
    const params = new URLSearchParams();

    if (options?.source) params.set("source", options.source);
    if (options?.status) params.set("status", options.status);
    if (options?.limit) params.set("limit", String(options.limit));

    const query = params.toString();

    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: await getPharmacyAuthHeaders(),
      },
    );

    return readPharmacyResponse<{
      total: number;
      orders: PharmacyOrderListItem[];
    }>(response);
  },

  async getOrderDetail(orderId: string) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        headers: await getPharmacyAuthHeaders(),
      },
    );

    return readPharmacyResponse<PharmacyOrderDetailResponse>(response);
  },

  async getPatientRefillEvidenceSource(orderId: string) {
    const headers = await getPharmacyAuthHeaders();

    return {
      uri: `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(
        orderId,
      )}/patient-refill-evidence`,
      headers,
    };
  },

  async verifyPatientRefillRequest(orderId: string, note?: string) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(
        orderId,
      )}/verify-patient-request`,
      {
        method: "PATCH",
        headers: {
          ...(await getPharmacyAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(note?.trim() ? { note: note.trim() } : {}),
      },
    );

    return readPharmacyResponse<PharmacyOrderDetailResponse>(response);
  },

  async updateOrderStatus(
    orderId: string,
    status: PharmacyOrderStatus,
    reason?: string,
  ) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: "PATCH",
        headers: {
          ...(await getPharmacyAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          ...(reason?.trim() ? { reason: reason.trim() } : {}),
        }),
      },
    );

    return readPharmacyResponse<{
      order: {
        id: string;
        orderNumber: string | null;
        status: PharmacyOrderStatus;
        statusReason: string | null;
        fulfilmentAllowed: boolean;
        updatedAt: string;
      };
      allowedNextStatuses: PharmacyOrderStatus[];
    }>(response);
  },

  async getInventoryCandidates(orderId: string, orderItemId: string) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(
        orderId,
      )}/items/${encodeURIComponent(orderItemId)}/inventory-candidates`,
      {
        method: "GET",
        headers: await getPharmacyAuthHeaders(),
      },
    );

    return readPharmacyResponse<PharmacyInventoryCandidatesResponse>(response);
  },

  async confirmInventoryMatch(
    orderId: string,
    orderItemId: string,
    inventoryItemId: string,
    quantity: number,
  ) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(
        orderId,
      )}/items/${encodeURIComponent(orderItemId)}/inventory-match`,
      {
        method: "PATCH",
        headers: {
          ...(await getPharmacyAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryItemId,
          quantity,
        }),
      },
    );

    return readPharmacyResponse<{
      item: {
        id: string;
        name: string;
        dose: string | null;
        quantity: string | null;
        quantityUnit: string | null;

        unitPricePence: number;
        lineTotalPence: number;

        dispensedQuantity: number | null;
        dispensedUnit: string | null;

        inventoryItemId: string;
        inventoryReservedQuantity: number;
        inventoryReservedAt: string;
        inventoryConsumedAt: string | null;
        inventoryReleasedAt: string | null;

        inventoryItem: PharmacyOrderInventoryItem;
      };

      dispensing: {
        packages: number;
        packageUnit: string;
        packSize: number;
        contentUnit: string;
        dispensedQuantity: number;
      };

      pricing: {
        unitPricePence: number;
        lineTotalPence: number;
        orderAmountPence: number;
        pricingComplete: boolean;
        currency: string;
      };

      availableAfterReservation: number;
    }>(response);
  },

  async releaseInventoryMatch(orderId: string, orderItemId: string) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(
        orderId,
      )}/items/${encodeURIComponent(orderItemId)}/inventory-match`,
      {
        method: "DELETE",
        headers: await getPharmacyAuthHeaders(),
      },
    );

    return readPharmacyResponse<{
      item: {
        id: string;
        name: string;
        inventoryItemId: null;
        inventoryReservedQuantity: number;
        inventoryReservedAt: null;
        inventoryConsumedAt: string | null;
        inventoryReleasedAt: string;
        unitPricePence: null;
        lineTotalPence: null;
        dispensedQuantity: null;
        dispensedUnit: null;
      };

      pricing: {
        orderAmountPence: number;
        pricingComplete: boolean;
        currency: string;
      };
    }>(response);
  },
};
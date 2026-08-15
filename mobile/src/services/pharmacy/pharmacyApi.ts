import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

export type PharmacyOrderSource = "DOCTOR_PRESCRIPTION" | "PATIENT_SUBMISSION" | "REFILL_REQUEST" | "MANUAL_REQUEST";
export type PharmacyOrderStatus = "RECEIVED" | "ACCEPTED" | "REJECTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "COLLECTED" | "DELAYED" | "OUT_OF_STOCK" | "CANCELLED";
export type PharmacyPaymentStatus = "PENDING" | "PAID" | "FAILED" | "NOT_REQUIRED" | "REFUNDED";
export type PrescriptionChargePreference = "CHARGEABLE" | "EXEMPT" | "PPC";

export type PharmacyExemptionStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type PharmacyExemptionChargePreference = "EXEMPT" | "PPC";
export type PharmacyExemptionType =
  | "AGE_BASED"
  | "MEDICAL_EXEMPTION"
  | "MATERNITY_EXEMPTION"
  | "LOW_INCOME_HC2"
  | "UNIVERSAL_CREDIT"
  | "PPC"
  | "OTHER";

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
  patient: { id: string; fullName: string };
  doctor: { id: string; fullName: string } | null;
  payment: {
    chargePreference: PrescriptionChargePreference;
    status: PharmacyPaymentStatus;
    amountPence: number;
    currency: string;
  } | null;
};

export type PharmacyDashboardData = {
  pharmacy: {
    id: string;
    fullName: string;
    pharmacyName: string;
    registrationNumber: string;
    city: string;
    postcode: string;
  };
  counts: {
    newOrders: number;
    preparing: number;
    ready: number;
    completed: number;
    doctorPrescriptions: number;
    patientSubmissions: number;
    paymentPending: number;
    exemptionPending: number;
  };
  recentOrders: PharmacyOrderListItem[];
};

export type PharmacyOrderDetail = {
  id: string;
  orderNumber: string | null;
  orderSource: PharmacyOrderSource;
  status: PharmacyOrderStatus;
  statusReason: string | null;
  medicineName: string;
  dose: string | null;
  quantity: number | null;
  instructions: string | null;
  requestedByRole: string | null;
  requestedByName: string | null;
  requestNote: string | null;
  prescriptionConfirmed: boolean;
  prescriptionConfirmedAt: string | null;
  fulfilmentAllowed: boolean;
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
    doctorProfile: { specialization: string | null } | null;
  } | null;

  prescription: {
    id: string;
    source: string;
    prescribedAt: string;
    notes: string | null;
  } | null;

  patientSubmission: {
    id: string;
    requestType: string;
    status: string;
    imageUrl: string | null;
    notes: string | null;
    createdAt: string;
  } | null;

  items: {
    id: string;
    medicineId: string | null;
    prescriptionItemId: string | null;
    submissionItemId: string | null;
    name: string;
    dose: string | null;
    quantity: number | null;
    instructions: string | null;
    dispensedQuantity: number;
    quantityUnit: string | null;
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

export type PharmacyExemptionReviewListItem = {
  id: string;
  chargePreference: PharmacyExemptionChargePreference;
  exemptionType: PharmacyExemptionType;
  referenceNumber: string | null;
  expiresAt: string | null;
  status: PharmacyExemptionStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type PharmacyExemptionDocument = {
  index: number;
  fileName: string;
};

export type PharmacyExemptionReviewDetail = PharmacyExemptionReviewListItem & {
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  documents: PharmacyExemptionDocument[];
  patient: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    addressLine: string | null;
    postcode: string | null;
  };
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Unable to complete request";
  return "Unable to complete request";
};

const getToken = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Authentication required");
  return token;
};

const getAuthHeaders = async () => {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T> | any = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) throw new Error(getErrorMessage(result));
  return result.data;
};

export const pharmacyApi = {
  async getDashboard(): Promise<PharmacyDashboardData> {
    const response = await fetch(`${API_BASE_URL}/pharmacy/dashboard`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<PharmacyDashboardData>(response);
  },

  async getOrders(options?: { source?: PharmacyOrderSource; status?: PharmacyOrderStatus; limit?: number }) {
    const params = new URLSearchParams();

    if (options?.source) params.set("source", options.source);
    if (options?.status) params.set("status", options.status);
    if (options?.limit) params.set("limit", String(options.limit));

    const query = params.toString();

    const response = await fetch(`${API_BASE_URL}/pharmacy/orders${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<{ total: number; orders: PharmacyOrderListItem[] }>(response);
  },

  async getOrderDetail(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<{ order: PharmacyOrderDetail }>(response);
  },

  async getExemptionReviews(options?: { status?: PharmacyExemptionStatus; limit?: number }) {
    const params = new URLSearchParams();

    if (options?.status) params.set("status", options.status);
    if (options?.limit) params.set("limit", String(options.limit));

    const query = params.toString();

    const response = await fetch(`${API_BASE_URL}/pharmacy/exemption-reviews${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<{ total: number; reviews: PharmacyExemptionReviewListItem[] }>(response);
  },

  async getExemptionReview(evidenceId: string) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(evidenceId)}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<{ review: PharmacyExemptionReviewDetail }>(response);
  },

  async verifyExemptionEvidence(evidenceId: string) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(evidenceId)}/verify`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
    });

    return readResponse<{ review: PharmacyExemptionReviewDetail }>(response);
  },

  async rejectExemptionEvidence(evidenceId: string, reason: string) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(evidenceId)}/reject`, {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    return readResponse<{ review: PharmacyExemptionReviewDetail }>(response);
  },

  async getExemptionDocumentSource(evidenceId: string, documentIndex: number) {
    const token = await getToken();

    return {
      uri: `${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(evidenceId)}/documents/${documentIndex}`,
      headers: { Authorization: `Bearer ${token}` },
    };
  },
};
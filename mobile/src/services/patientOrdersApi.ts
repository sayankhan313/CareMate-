import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type PatientOrderStatus = "RECEIVED" | "ACCEPTED" | "REJECTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "COLLECTED" | "CANCELLED" | "DELAYED" | "OUT_OF_STOCK";
export type PatientOrderSource = "DOCTOR_PRESCRIPTION" | "PATIENT_SUBMISSION" | "REFILL_REQUEST" | "MANUAL_REQUEST";
export type PatientOrderVerificationPath = "CAREMATE_PRESCRIPTION" | "ASSIGNED_DOCTOR" | "EXTERNAL_EVIDENCE";
export type PatientOrderDoctorVerificationStatus = "NOT_REQUIRED" | "PENDING" | "CONFIRMED" | "REJECTED";
export type PatientOrderChargePreference = "CHARGEABLE" | "EXEMPT" | "PPC";
export type PatientOrderPaymentStatus = "PENDING" | "PAID" | "FAILED" | "NOT_REQUIRED" | "REFUNDED";
export type PatientOrderPaymentProvider = "STRIPE";

export type PatientOrder = {
  id: string;
  orderNumber: string;
  source: PatientOrderSource;
  status: PatientOrderStatus;
  statusReason?: string | null;

  medicineName?: string | null;
  dose?: string | null;
  quantity?: number | string | null;
  instructions?: string | null;

  requestedByRole?: string | null;
  requestedByName?: string | null;
  requestNote?: string | null;

  prescriptionConfirmed: boolean;
  prescriptionConfirmedAt?: string | null;
  fulfilmentAllowed: boolean;

  pharmacy: {
    id: string;
    pharmacyName: string;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
  } | null;

  doctor: {
    id: string;
    fullName: string;
    specialization?: string | null;
  } | null;

  verification: {
    submissionId: string;
    requestType?: string | null;
    submissionStatus?: string | null;
    verificationPath?: PatientOrderVerificationPath | null;
    doctorVerificationStatus?: PatientOrderDoctorVerificationStatus | null;
    doctorVerificationNote?: string | null;
    doctorVerificationRequestedAt?: string | null;
    doctorVerifiedAt?: string | null;
    verificationDoctor: { id: string; fullName: string } | null;
    evidenceType?: string | null;
    hasEvidence: boolean;
    pharmacyReviewNote?: string | null;
    pharmacyReviewedAt?: string | null;
  } | null;

  items: {
    id: string;
    medicineId?: string | null;
    name: string;
    dose?: string | null;
    quantity: number | string;
    quantityUnit?: string | null;
    instructions?: string | null;
    dispensedQuantity?: number | null;
  }[];

  payment: {
    id: string;
    chargePreference: PatientOrderChargePreference;
    amountPence: number;
    currency: string;
    provider: PatientOrderPaymentProvider;
    testMode: boolean;
    status: PatientOrderPaymentStatus;
    paidAt?: string | null;
    failedAt?: string | null;
    refundedAt?: string | null;
  } | null;

  timeline: {
    id: string;
    fromStatus?: PatientOrderStatus | null;
    toStatus: PatientOrderStatus;
    note?: string | null;
    createdAt: string;
  }[];

  acceptedAt?: string | null;
  rejectedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  collectedAt?: string | null;
  cancelledAt?: string | null;
  delayedAt?: string | null;
  outOfStockAt?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type PatientOrdersResponse = {
  summary: {
    total: number;
    active: number;
    completed: number;
    needsAttention: number;
  };
  orders: PatientOrder[];
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const getToken = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");
  return token;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T>;

  try {
    result = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) throw new Error(result.message || "Unable to load pharmacy orders.");
  if (!result.data) throw new Error("The server response did not contain order data.");

  return result.data;
};

export const patientOrdersApi = {
  async listOrders(): Promise<PatientOrdersResponse> {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-orders`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await readResponse<PatientOrdersResponse>(response);

    return {
      summary: {
        total: Number(data.summary?.total || 0),
        active: Number(data.summary?.active || 0),
        completed: Number(data.summary?.completed || 0),
        needsAttention: Number(data.summary?.needsAttention || 0),
      },
      orders: Array.isArray(data.orders) ? data.orders : [],
    };
  },
};
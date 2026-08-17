import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type PatientOrderStatus =
  | "RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COLLECTED"
  | "CANCELLED"
  | "DELAYED"
  | "OUT_OF_STOCK";

export type PatientOrderSource =
  | "DOCTOR_PRESCRIPTION"
  | "PATIENT_SUBMISSION"
  | "REFILL_REQUEST"
  | "MANUAL_REQUEST";

export type PatientOrderVerificationPath =
  | "CAREMATE_PRESCRIPTION"
  | "ASSIGNED_DOCTOR"
  | "EXTERNAL_EVIDENCE";

export type PatientOrderDoctorVerificationStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED";

export type PatientOrder = {
  id: string;
  orderNumber: string;
  source: PatientOrderSource;
  status: PatientOrderStatus;
  statusReason?: string | null;

  medicineName?: string | null;
  dose?: string | null;
  quantity?: number | null;
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
    verificationDoctor: {
      id: string;
      fullName: string;
    } | null;
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
    quantity: number;
    quantityUnit?: string | null;
    instructions?: string | null;
    dispensedQuantity?: number | null;
  }[];

  payment: {
    id: string;
    chargePreference?: string | null;
    amountPence?: number | null;
    currency?: string | null;
    provider?: string | null;
    testMode?: boolean | null;
    status?: string | null;
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

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  return "Unable to load pharmacy orders.";
};

export const patientOrdersApi = {
  async listOrders(): Promise<PatientOrdersResponse> {
    const token = await tokenStorage.getToken();

    if (!token) {
      throw new Error("Please login again.");
    }

    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return {
      summary: {
        total: Number(result?.data?.summary?.total || 0),
        active: Number(result?.data?.summary?.active || 0),
        completed: Number(result?.data?.summary?.completed || 0),
        needsAttention: Number(result?.data?.summary?.needsAttention || 0),
      },
      orders: Array.isArray(result?.data?.orders) ? result.data.orders : [],
    };
  },
};
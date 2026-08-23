import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type CaregiverPharmacyOrderStatus =
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

export type CaregiverPharmacyOrderItem = {
  id: string;
  medicineId: string | null;
  name: string;
  dose: string | null;
  quantity: number;
  quantityUnit: string | null;
  dispensedQuantity: number | null;
};

export type CaregiverPharmacyOrder = {
  id: string;
  orderNumber: string;
  source: string;
  status: CaregiverPharmacyOrderStatus;
  statusReason: string | null;
  medicine: { name: string | null; dose: string | null; quantity: number | null };
  items: CaregiverPharmacyOrderItem[];
  pharmacy: { id: string; pharmacyName: string; city: string | null; postcode: string | null } | null;
  doctor: { id: string; fullName: string; specialization: string | null } | null;
  verification: {
    requestType: string;
    status: string;
    verificationPath: string | null;
    doctorVerificationStatus: string | null;
    doctorVerificationRequestedAt: string | null;
    doctorVerifiedAt: string | null;
    pharmacyReviewed: boolean;
  } | null;
  prescriptionConfirmed: boolean;
  prescriptionConfirmedAt: string | null;
  fulfilmentAllowed: boolean;
  payment: {
    chargePreference: string;
    amountPence: number | null;
    currency: string;
    status: string;
    paidAt: string | null;
  } | null;
  timeline: Array<{ id: string; fromStatus: string | null; toStatus: string; createdAt: string }>;
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
};

export type CaregiverPharmacyOrderList = {
  patient: { id: string; fullName: string };
  summary: { total: number; active: number; completed: number; needsAttention: number };
  orders: CaregiverPharmacyOrder[];
};

export type CaregiverPharmacyOrderDetail = {
  patient: { id: string; fullName: string };
  order: CaregiverPharmacyOrder;
};

const BASE_PATH = `${API_BASE_URL}/caregiver/patients`;

const getHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

const parseResponse = async <T>(response: Response) => {
  let result: ApiResponse<T> | any = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || !result.success) throw new Error(typeof result?.message === "string" ? result.message : "Request failed.");
  return result.data as T;
};

export const caregiverPharmacyOrderApi = {
  async listPatientOrders(patientId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/pharmacy-orders`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverPharmacyOrderList>(response);
  },

  async getPatientOrder(patientId: string, orderId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/pharmacy-orders/${encodeURIComponent(orderId)}`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverPharmacyOrderDetail>(response);
  },
};
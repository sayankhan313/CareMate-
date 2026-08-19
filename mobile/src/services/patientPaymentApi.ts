import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type StripePaymentStatus = "PENDING" | "PAID" | "FAILED" | "NOT_REQUIRED" | "REFUNDED";

export type PatientStripePayment = {
  id: string;
  amountPence: number;
  currency: string;
  status: StripePaymentStatus;
  paidAt?: string | null;
  failedAt?: string | null;
};

export type CreatePaymentIntentData = {
  alreadyPaid: boolean;
  clientSecret: string | null;
  stripePaymentIntentId: string;
  stripeStatus: string;
  payment: PatientStripePayment;
};

export type ConfirmPaymentData = {
  paid: boolean;
  stripeStatus: string;
  payment: PatientStripePayment;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const getToken = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T>;

  try {
    result = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) throw new Error(result.message || "Payment request failed.");
  if (!result.data) throw new Error("The server response did not contain payment data.");

  return result.data;
};

export const patientPaymentApi = {
  async createPaymentIntent(orderId: string) {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-orders/${encodeURIComponent(orderId)}/payment-intent`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    return readResponse<CreatePaymentIntentData>(response);
  },

  async confirmPayment(orderId: string) {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-orders/${encodeURIComponent(orderId)}/payment-confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    return readResponse<ConfirmPaymentData>(response);
  },
};
import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type CreatePharmacyRefillInput = {
  medicineId: string;
  requestedQuantity: number;
  quantityUnit: string;
  note?: string;
};

export type PharmacyRefillResponse = {
  submission: {
    id: string;
    requestType: "REFILL_REQUEST";
    status: string;
    medicineId: string;
  };
  order: {
    id: string;
    orderNumber: string | null;
    status: string;
    orderSource: "REFILL_REQUEST";
    prescriptionConfirmed: boolean;
    fulfilmentAllowed: boolean;
  };
  pharmacy: {
    id: string;
    pharmacyName: string;
  };
  medicine: {
    id: string;
    name: string;
    dose: string;
    source: string;
  };
  requiresPharmacyVerification: boolean;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: any = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result.message || "Unable to send medicine request.");
  }

  return result.data as T;
};

const getHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const patientPharmacyRefillApi = {
  async createRefill(input: CreatePharmacyRefillInput) {
    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-refills`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({
        medicineId: input.medicineId,
        requestedQuantity: input.requestedQuantity,
        quantityUnit: input.quantityUnit.trim(),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      }),
    });

    return readResponse<PharmacyRefillResponse>(response);
  },
};
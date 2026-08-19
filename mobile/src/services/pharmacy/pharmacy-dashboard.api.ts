import { API_BASE_URL } from "../../constants/api";
import {
  getPharmacyAuthHeaders,
  readPharmacyResponse,
} from "./pharmacy-api.utils";
import type {
  PharmacyOrderListItem,
} from "./pharmacy-orders.api";

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
    refillRequests: number;
    patientSubmissions: number;
    paymentPending: number;
    exemptionPending: number;
  };

  recentOrders: PharmacyOrderListItem[];
};

export const pharmacyDashboardApi = {
  async getDashboard(): Promise<PharmacyDashboardData> {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/dashboard`,
      {
        method: "GET",
        headers: await getPharmacyAuthHeaders(),
      }
    );

    return readPharmacyResponse<PharmacyDashboardData>(
      response
    );
  },
};
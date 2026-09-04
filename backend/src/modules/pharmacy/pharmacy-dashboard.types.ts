import type { PharmacyOrderListItem } from "./pharmacy-orders.types.js";

export type PharmacyDashboardResponse = {
  pharmacy: {
    id: string;
    fullName: string;
    pharmacyName: string;
    registrationNumber: string;
    city: string;
    postcode: string;
  };
  counts: {
    unreadNotifications: number;
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
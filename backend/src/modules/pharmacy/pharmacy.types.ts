export type PharmacyOrderSource = "DOCTOR_PRESCRIPTION" | "PATIENT_SUBMISSION" | "REFILL_REQUEST" | "MANUAL_REQUEST";
export type PharmacyOrderStatus = "RECEIVED" | "ACCEPTED" | "REJECTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "COLLECTED" | "DELAYED" | "OUT_OF_STOCK" | "CANCELLED";
export type PharmacyPaymentStatus = "PENDING" | "PAID" | "FAILED" | "NOT_REQUIRED" | "REFUNDED";

export type PharmacyOrderListItem = {
  id: string;
  orderNumber: string | null;
  source: PharmacyOrderSource;
  status: PharmacyOrderStatus;
  medicineName: string;
  itemCount: number;
  prescriptionConfirmed: boolean;
  fulfilmentAllowed: boolean;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; fullName: string };
  doctor: { id: string; fullName: string } | null;
  payment: { chargePreference: "CHARGEABLE" | "EXEMPT" | "PPC"; status: PharmacyPaymentStatus; amountPence: number; currency: string } | null;
};

export type PharmacyDashboardResponse = {
  pharmacy: { id: string; fullName: string; pharmacyName: string; registrationNumber: string; city: string; postcode: string };
  counts: { newOrders: number; preparing: number; ready: number; completed: number; doctorPrescriptions: number; patientSubmissions: number; paymentPending: number };
  recentOrders: PharmacyOrderListItem[];
};

export type PharmacyOrdersResponse = { total: number; orders: PharmacyOrderListItem[] };
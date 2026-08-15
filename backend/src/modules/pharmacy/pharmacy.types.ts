export type PharmacyOrderSource = "DOCTOR_PRESCRIPTION" | "PATIENT_SUBMISSION" | "REFILL_REQUEST" | "MANUAL_REQUEST";
export type PharmacyOrderStatus = "RECEIVED" | "ACCEPTED" | "REJECTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "COLLECTED" | "DELAYED" | "OUT_OF_STOCK" | "CANCELLED";
export type PharmacyPaymentStatus = "PENDING" | "PAID" | "FAILED" | "NOT_REQUIRED" | "REFUNDED";

export type PharmacyExemptionStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type PharmacyExemptionChargePreference = "EXEMPT" | "PPC";
export type PharmacyExemptionType = "AGE_BASED" | "MEDICAL_EXEMPTION" | "MATERNITY_EXEMPTION" | "LOW_INCOME_HC2" | "UNIVERSAL_CREDIT" | "PPC" | "OTHER";

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

export type PharmacyOrdersResponse = { total: number; orders: PharmacyOrderListItem[] };

export type PharmacyExemptionDocument = {
  index: number;
  fileName: string;
};

export type PharmacyExemptionReviewListItem = {
  id: string;
  chargePreference: PharmacyExemptionChargePreference;
  exemptionType: PharmacyExemptionType;
  referenceNumber: string | null;
  expiresAt: Date | null;
  status: PharmacyExemptionStatus;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; fullName: string; email: string };
};

export type PharmacyExemptionReviewDetail = PharmacyExemptionReviewListItem & {
  verifiedAt: Date | null;
  rejectedAt: Date | null;
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

export type PharmacyExemptionReviewsResponse = {
  total: number;
  reviews: PharmacyExemptionReviewListItem[];
};
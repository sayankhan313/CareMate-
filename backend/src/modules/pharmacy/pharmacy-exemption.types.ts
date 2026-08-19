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
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
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
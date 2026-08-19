import { API_BASE_URL } from "../../constants/api";
import {
  getPharmacyAuthHeaders,
  getPharmacyToken,
  readPharmacyResponse,
} from "./pharmacy-api.utils";

export type PharmacyExemptionStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export type PharmacyExemptionChargePreference =
  | "EXEMPT"
  | "PPC";

export type PharmacyExemptionType =
  | "AGE_BASED"
  | "MEDICAL_EXEMPTION"
  | "MATERNITY_EXEMPTION"
  | "LOW_INCOME_HC2"
  | "UNIVERSAL_CREDIT"
  | "PPC"
  | "OTHER";

export type PharmacyExemptionReviewListItem = {
  id: string;
  chargePreference: PharmacyExemptionChargePreference;
  exemptionType: PharmacyExemptionType;
  referenceNumber: string | null;
  expiresAt: string | null;
  status: PharmacyExemptionStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;

  patient: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type PharmacyExemptionDocument = {
  index: number;
  fileName: string;
};

export type PharmacyExemptionReviewDetail =
  PharmacyExemptionReviewListItem & {
    verifiedAt: string | null;
    rejectedAt: string | null;
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

export const pharmacyExemptionApi = {
  async getExemptionReviews(options?: {
    status?: PharmacyExemptionStatus;
    limit?: number;
  }) {
    const params = new URLSearchParams();

    if (options?.status) {
      params.set("status", options.status);
    }

    if (options?.limit) {
      params.set("limit", String(options.limit));
    }

    const query = params.toString();

    const response = await fetch(
      `${API_BASE_URL}/pharmacy/exemption-reviews${
        query ? `?${query}` : ""
      }`,
      {
        method: "GET",
        headers: await getPharmacyAuthHeaders(),
      }
    );

    return readPharmacyResponse<{
      total: number;
      reviews: PharmacyExemptionReviewListItem[];
    }>(response);
  },

  async getExemptionReview(evidenceId: string) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(
        evidenceId
      )}`,
      {
        method: "GET",
        headers: await getPharmacyAuthHeaders(),
      }
    );

    return readPharmacyResponse<{
      review: PharmacyExemptionReviewDetail;
    }>(response);
  },

  async verifyExemptionEvidence(evidenceId: string) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(
        evidenceId
      )}/verify`,
      {
        method: "PATCH",
        headers: await getPharmacyAuthHeaders(),
      }
    );

    return readPharmacyResponse<{
      review: PharmacyExemptionReviewDetail;
    }>(response);
  },

  async rejectExemptionEvidence(
    evidenceId: string,
    reason: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(
        evidenceId
      )}/reject`,
      {
        method: "PATCH",
        headers: {
          ...(await getPharmacyAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      }
    );

    return readPharmacyResponse<{
      review: PharmacyExemptionReviewDetail;
    }>(response);
  },

  async getExemptionDocumentSource(
    evidenceId: string,
    documentIndex: number
  ) {
    const token = await getPharmacyToken();

    return {
      uri: `${API_BASE_URL}/pharmacy/exemption-reviews/${encodeURIComponent(
        evidenceId
      )}/documents/${documentIndex}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  },
};
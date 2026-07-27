import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AdminAccountStatus =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "APPROVED"
  | "REJECTED"
  | "DISABLED";

export type AdminUserRole =
  | "PATIENT"
  | "DOCTOR"
  | "CAREGIVER"
  | "PHARMACY"
  | "ADMIN";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: AdminUserRole;
  accountStatus: AdminAccountStatus;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminDoctorProfile = {
  id: string;
  phoneNumber: string;
  gmcNumber: string;
  specialization: string;
  clinicName: string;
  clinicAddress: string | null;
  yearsExperience: number | null;
  bio: string | null;
  verificationCheckedAt?: string | null;
  verificationNotes?: string | null;
};

export type AdminDoctorDocuments = {
  gmcDocumentUrl: string;
  photoIdDocumentUrl: string;
  qualificationDocumentUrl: string;
};

export type AdminDoctorVerification = {
  id: string;
  fullName: string;
  email: string;
  role: "DOCTOR";
  accountStatus: AdminAccountStatus;
  isEmailVerified: boolean;
  submittedAt: string;
  updatedAt: string;
  profile: AdminDoctorProfile | null;
  documents: AdminDoctorDocuments | null;
};

export type AdminPharmacyProfile = {
  id: string;
  pharmacyName: string;
  staffName: string;
  phoneNumber: string;
  email: string | null;
  registrationNumber: string;
  licenseNumber: string;
  address: string;
  city: string;
  postcode: string;
  openingHours: string | null;
  serviceType: string | null;
  notifyNewOrders: boolean;
  notifyStatusReminders: boolean;
  notifyDelayedOrders: boolean;
  verificationCheckedAt?: string | null;
  verificationNotes?: string | null;
};

export type AdminPharmacyDocuments = {
  licenseDocumentUrl: string;
  addressProofDocumentUrl: string;
};

export type AdminPharmacyVerification = {
  id: string;
  fullName: string;
  email: string;
  role: "PHARMACY";
  accountStatus: AdminAccountStatus;
  isEmailVerified: boolean;
  submittedAt: string;
  updatedAt: string;
  profile: AdminPharmacyProfile | null;
  documents: AdminPharmacyDocuments | null;
};

export type AdminDashboardStats = {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalPharmacies: number;
  pendingDoctors: number;
  approvedDoctors: number;
  rejectedDoctors: number;
  pendingPharmacies: number;
  approvedPharmacies: number;
  rejectedPharmacies: number;
  disabledUsers: number;
};

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  recentDoctorVerifications: AdminDoctorVerification[];
  recentPharmacyVerifications: AdminPharmacyVerification[];
};

export type UserListResult = {
  users: AdminUser[];
};

export type UserSuspendResult = {
  user: AdminUser;
};

export type DoctorVerificationListResult = {
  status: AdminAccountStatus;
  doctors: AdminDoctorVerification[];
};

export type DoctorVerificationDetailResult = {
  doctor: AdminDoctorVerification;
};

export type PharmacyVerificationListResult = {
  status: AdminAccountStatus;
  pharmacies: AdminPharmacyVerification[];
};

export type PharmacyVerificationDetailResult = {
  pharmacy: AdminPharmacyVerification;
};

export type VerificationDecision = {
  action: "APPROVED" | "REJECTED";
  reviewedByAdminId: string;
  notes: string | null;
  reviewedAt: string;
};

export type DoctorVerificationDecisionResult = {
  doctor: AdminDoctorVerification;
  decision: VerificationDecision;
};

export type PharmacyVerificationDecisionResult = {
  pharmacy: AdminPharmacyVerification;
  decision: VerificationDecision;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Request failed.";
  }

  if (Array.isArray(result?.errors)) {
    return result.errors[0]?.message || "Request failed.";
  }

  return "Request failed.";
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getBackendOrigin = () => {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
};

export const buildAdminDocumentUrl = (documentUrl?: string | null) => {
  if (!documentUrl) {
    return null;
  }

  if (
    documentUrl.startsWith("http://") ||
    documentUrl.startsWith("https://")
  ) {
    return documentUrl;
  }

  return `${getBackendOrigin()}${documentUrl}`;
};

export const adminApi = {
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<AdminDashboardData> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as AdminDashboardData;
  },

  async listUsers() {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<UserListResult> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as UserListResult;
  },

  async suspendUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/suspend`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({}),
    });

    const result: ApiResponse<UserSuspendResult> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as UserSuspendResult;
  },

  async listDoctorVerifications(
    status: AdminAccountStatus = "PENDING_VERIFICATION"
  ) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/doctors?status=${status}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<DoctorVerificationListResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as DoctorVerificationListResult;
  },

  async getDoctorVerification(userId: string) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/doctors/${userId}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<DoctorVerificationDetailResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as DoctorVerificationDetailResult;
  },

  async approveDoctorVerification(
    userId: string,
    notes = "GMC number and uploaded documents reviewed."
  ) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/doctors/${userId}/approve`,
      {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          notes,
        }),
      }
    );

    const result: ApiResponse<DoctorVerificationDecisionResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as DoctorVerificationDecisionResult;
  },

  async rejectDoctorVerification(
    userId: string,
    notes = "Verification documents are incomplete."
  ) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/doctors/${userId}/reject`,
      {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          notes,
        }),
      }
    );

    const result: ApiResponse<DoctorVerificationDecisionResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as DoctorVerificationDecisionResult;
  },

  async listPharmacyVerifications(
    status: AdminAccountStatus = "PENDING_VERIFICATION"
  ) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/pharmacies?status=${status}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<PharmacyVerificationListResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as PharmacyVerificationListResult;
  },

  async getPharmacyVerification(userId: string) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/pharmacies/${userId}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<PharmacyVerificationDetailResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as PharmacyVerificationDetailResult;
  },

  async approvePharmacyVerification(
    userId: string,
    notes = "Pharmacy licence and address proof reviewed."
  ) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/pharmacies/${userId}/approve`,
      {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          notes,
        }),
      }
    );

    const result: ApiResponse<PharmacyVerificationDecisionResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as PharmacyVerificationDecisionResult;
  },

  async rejectPharmacyVerification(
    userId: string,
    notes = "Pharmacy verification documents are incomplete."
  ) {
    const response = await fetch(
      `${API_BASE_URL}/admin/verifications/pharmacies/${userId}/reject`,
      {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          notes,
        }),
      }
    );

    const result: ApiResponse<PharmacyVerificationDecisionResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as PharmacyVerificationDecisionResult;
  },
};
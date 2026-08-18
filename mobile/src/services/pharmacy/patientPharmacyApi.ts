import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

export type PatientPharmacy = {
  id: string;
  fullName: string;
  email: string;
  accountStatus: string;
  pharmacyName: string;
  staffName: string | null;
  phoneNumber: string | null;
  registrationNumber: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  openingHours: string | null;
  serviceType: string | null;
  isAvailable: boolean;
  isSaved: boolean;
  isPrimary: boolean;
  linkId: string | null;
  savedAt: string | null;
  updatedAt: string | null;
};

export type ApprovedPharmaciesData = {
  primaryPharmacyId: string | null;
  total: number;
  pharmacies: PatientPharmacy[];
};

export type SavedPharmaciesData = {
  primaryPharmacyId: string | null;
  totalSavedPharmacies: number;
  pharmacies: PatientPharmacy[];
};

export type SavePharmacyData = {
  primaryPharmacyId: string | null;
  pharmacy: PatientPharmacy;
  link: {
    id: string;
    pharmacyId: string;
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

export type SetPrimaryPharmacyData = SavePharmacyData;

export type RemovePharmacyData = {
  removedPharmacyId: string;
  removedPrimaryPharmacy: boolean;
  primaryPharmacyId: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ListPharmaciesOptions = {
  search?: string;
  city?: string;
  postcode?: string;
  limit?: number;
};

const getErrorMessage = <T>(result: ApiResponse<T>) => result.message || "Something went wrong. Please try again.";

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const readResponse = async <T>(response: Response) => {
  let result: ApiResponse<T>;

  try {
    result = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) throw new Error(getErrorMessage(result));
  if (!result.data) throw new Error("The server response did not contain data.");

  return result.data;
};

const buildPharmacyQuery = (options: ListPharmaciesOptions) => {
  const query: string[] = [];
  const search = options.search?.trim();
  const city = options.city?.trim();
  const postcode = options.postcode?.trim();

  if (search) query.push(`search=${encodeURIComponent(search)}`);
  if (city) query.push(`city=${encodeURIComponent(city)}`);
  if (postcode) query.push(`postcode=${encodeURIComponent(postcode)}`);
  if (options.limit) query.push(`limit=${options.limit}`);

  return query.length > 0 ? `?${query.join("&")}` : "";
};

export const patientPharmacyApi = {
  async getApprovedPharmacies(options: ListPharmaciesOptions = {}) {
    const headers = await getAuthHeaders();
    const query = buildPharmacyQuery(options);

    const response = await fetch(`${API_BASE_URL}/patient/pharmacies${query}`, {
      method: "GET",
      headers,
    });

    return readResponse<ApprovedPharmaciesData>(response);
  },

  async getSavedPharmacies() {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacies/saved`, {
      method: "GET",
      headers,
    });

    return readResponse<SavedPharmaciesData>(response);
  },

  async savePharmacy(pharmacyId: string) {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacies/${encodeURIComponent(pharmacyId)}/save`, {
      method: "POST",
      headers,
    });

    return readResponse<SavePharmacyData>(response);
  },

  async setPrimaryPharmacy(pharmacyId: string) {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacies/${encodeURIComponent(pharmacyId)}/primary`, {
      method: "PATCH",
      headers,
    });

    return readResponse<SetPrimaryPharmacyData>(response);
  },

  async removePharmacy(pharmacyId: string) {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacies/${encodeURIComponent(pharmacyId)}`, {
      method: "DELETE",
      headers,
    });

    return readResponse<RemovePharmacyData>(response);
  },
};
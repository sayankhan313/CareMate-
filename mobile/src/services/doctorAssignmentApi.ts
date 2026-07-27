import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type DoctorAssignmentType = "PRIMARY" | "SPECIALIST";
export type DoctorAssignmentStatus = "ACTIVE" | "INACTIVE";

export type DoctorSpecialty = {
  name: string;
  doctorCount: number;
};

export type ApprovedDoctor = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  gmcNumber: string | null;
  specialization: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  yearsExperience: number | null;
  bio: string | null;
  isAssigned: boolean;
  isPrimary: boolean;
  assignmentId: string | null;
  assignmentType: DoctorAssignmentType | null;
  assignmentStatus: DoctorAssignmentStatus | null;
  assignedAt: string | null;
};

export type AssignedDoctor = {
  assignmentId: string;
  assignmentType: DoctorAssignmentType;
  status: DoctorAssignmentStatus;
  assignedAt: string;
  updatedAt: string;
  doctor: ApprovedDoctor;
};

export type DoctorSpecialtiesData = {
  specialties: DoctorSpecialty[];
};

export type ApprovedDoctorsData = {
  assignedDoctorId: string | null;
  primaryDoctorId: string | null;
  assignedDoctorIds: string[];
  doctors: ApprovedDoctor[];
};

export type AssignedDoctorsData = {
  primaryDoctorId: string | null;
  totalAssignedDoctors: number;
  doctors: AssignedDoctor[];
};

export type AssignDoctorData = {
  doctor: ApprovedDoctor;
  assignment: {
    id: string;
    assignmentType: DoctorAssignmentType;
    status: DoctorAssignmentStatus;
    assignedAt: string;
  };
  primaryDoctorId: string | null;
};

export type SetPrimaryDoctorData = {
  primaryDoctorId: string;
  doctor: ApprovedDoctor;
};

export type RemoveDoctorData = {
  removedDoctorId: string;
  removedAssignmentType: DoctorAssignmentType;
  primaryDoctorId: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ListDoctorsOptions = {
  specialization?: string;
  search?: string;
  limit?: number;
};

const getErrorMessage = <T>(result: ApiResponse<T>) => {
  return result.message || "Something went wrong. Please try again.";
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

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

  if (!response.ok || !result.success) {
    throw new Error(getErrorMessage(result));
  }

  if (!result.data) {
    throw new Error("The server response did not contain data.");
  }

  return result.data;
};

const buildDoctorQuery = (options: ListDoctorsOptions) => {
  const query: string[] = [];

  const specialization = options.specialization?.trim();
  const search = options.search?.trim();

  if (specialization) {
    query.push(
      `specialization=${encodeURIComponent(specialization)}`
    );
  }

  if (search) {
    query.push(`search=${encodeURIComponent(search)}`);
  }

  if (options.limit) {
    query.push(`limit=${options.limit}`);
  }

  return query.length > 0 ? `?${query.join("&")}` : "";
};

export const doctorAssignmentApi = {
  async getSpecialties() {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/doctors/specialties`,
      {
        method: "GET",
        headers,
      }
    );

    return readResponse<DoctorSpecialtiesData>(response);
  },

  async getApprovedDoctors(options: ListDoctorsOptions = {}) {
    const headers = await getAuthHeaders();
    const query = buildDoctorQuery(options);

    const response = await fetch(
      `${API_BASE_URL}/patient/doctors${query}`,
      {
        method: "GET",
        headers,
      }
    );

    return readResponse<ApprovedDoctorsData>(response);
  },

  async getAssignedDoctors() {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/doctor-assignments`,
      {
        method: "GET",
        headers,
      }
    );

    return readResponse<AssignedDoctorsData>(response);
  },

  async assignDoctor(
    doctorId: string,
    makePrimary = false
  ) {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/doctor-assignments`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          doctorId,
          makePrimary,
        }),
      }
    );

    return readResponse<AssignDoctorData>(response);
  },

  async setPrimaryDoctor(doctorId: string) {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/doctor-assignments/${encodeURIComponent(
        doctorId
      )}/primary`,
      {
        method: "PATCH",
        headers,
      }
    );

    return readResponse<SetPrimaryDoctorData>(response);
  },

  async removeDoctor(doctorId: string) {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/doctor-assignments/${encodeURIComponent(
        doctorId
      )}`,
      {
        method: "DELETE",
        headers,
      }
    );

    return readResponse<RemoveDoctorData>(response);
  },
};
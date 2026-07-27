import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorVitalStatus = "STABLE" | "WARNING" | "CRITICAL";

export type DoctorDashboardStats = {
  assignedPatients: number;
  activeAlerts: number;
  todayConsultations: number;
  pendingMedicineReviews: number;
};

export type DoctorVitalReading = {
  id: string;
  heartRate: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucose: number | null;
  temperature: number | null;
  status: DoctorVitalStatus;
  source: string;
  deviceSource: string | null;
  recordedAt: string;
};

export type DoctorDashboardPatient = {
  assignmentId: string;
  assignedAt: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    medicalConditions: string | null;
    emergencyContact: string | null;
  };
  latestVital: DoctorVitalReading | null;
  activeMedicineCount: number;
  activeAlert: {
    id: string;
    status: string;
    reason: string;
    timerEndsAt: string;
    createdAt: string;
  } | null;
};

export type DoctorUrgentAlert = {
  id: string;
  patientId: string;
  doctorId: string | null;
  status: "ACTIVE" | "ESCALATED" | "RESOLVED" | "CANCELLED" | string;
  reason: string;
  timerEndsAt: string;
  escalatedAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  vitalSummary: {
    label: string;
    value: string;
    status: DoctorVitalStatus;
  } | null;
  consultation: {
    id: string;
    type: "EMERGENCY" | "MANUAL" | string;
    status:
      | "PENDING"
      | "ACCEPTED"
      | "REJECTED"
      | "IN_PROGRESS"
      | "COMPLETED"
      | "CANCELLED"
      | string;
    reason: string;
    createdAt: string;
  } | null;
  canJoinCall: boolean;
};

export type DoctorUpcomingConsultation = {
  id: string;
  patientId: string;
  doctorId: string | null;
  safetyAlertId: string | null;
  type: "EMERGENCY" | "MANUAL" | string;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | string;
  reason: string;
  preferredAt: string | null;
  notes: string | null;
  doctorName: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export type DoctorDashboardData = {
  doctor: {
    id: string;
    fullName: string;
    email: string;
    accountStatus: string;
    specialization: string | null;
    clinicName: string | null;
  };
  stats: DoctorDashboardStats;
  urgentAlerts: DoctorUrgentAlert[];
  upcomingConsultations: DoctorUpcomingConsultation[];
  recentPatients: DoctorDashboardPatient[];
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

  if (Array.isArray(result?.issues)) {
    return result.issues[0]?.message || "Request failed.";
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

export const doctorDashboardApi = {
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/doctor/dashboard`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<DoctorDashboardData> | any =
      await response.json();

    if (!response.ok || !result.success) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as DoctorDashboardData;
  },
};
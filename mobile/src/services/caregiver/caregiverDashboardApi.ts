import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CaregiverVitalStatus = "STABLE" | "WARNING" | "CRITICAL";

export type CaregiverDashboardSummary = {
  linkedPatients: number;
  missedDosesToday: number;
  dosesDueSoon: number;
  unresolvedSafetyAlerts: number;
  criticalVitals: number;
  activeConsultations: number;
  lowStockMedicines: number;
  unreadNotifications: number;
};

export type CaregiverDashboardVital = {
  id: string;
  patientId: string;
  heartRate: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucose: number | null;
  temperature: number | null;
  status: CaregiverVitalStatus;
  source: string;
  recordedAt: string;
};

export type CaregiverDashboardSafetyAlert = {
  id: string;
  patientId: string;
  status: "ACTIVE" | "ESCALATED" | string;
  reason: string;
  createdAt: string;
  escalatedAt: string | null;
  doctor: {
    id: string;
    fullName: string;
  } | null;
};

export type CaregiverDashboardConsultation = {
  id: string;
  patientId: string;
  type: "EMERGENCY" | "MANUAL" | string;
  status: "PENDING" | "ACCEPTED" | "IN_PROGRESS" | string;
  preferredAt: string | null;
  doctorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaregiverDashboardPharmacyOrder = {
  id: string;
  patientId: string;
  orderNumber: string;
  medicineName: string;
  status: string;
  updatedAt: string;
};

export type CaregiverLowStockMedicine = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  currentStock: number | null;
  stockUnit: string | null;
  lowStockThreshold: number | null;
};

export type CaregiverDashboardPatient = {
  relationshipId: string;
  linkedAt: string | null;
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
  adherence: {
    missedToday: number;
    dueSoon: number;
  };
  latestVital: CaregiverDashboardVital | null;
  safetyAlert: CaregiverDashboardSafetyAlert | null;
  consultation: CaregiverDashboardConsultation | null;
  pharmacyOrder: CaregiverDashboardPharmacyOrder | null;
  lowStock: {
    count: number;
    medicines: CaregiverLowStockMedicine[];
  };
};

export type CaregiverDashboardNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  entityType: string | null;
  entityId: string | null;
  targetScreen: string | null;
  isRead: boolean;
  createdAt: string;
};

export type CaregiverDashboardData = {
  caregiver: {
    id: string;
    fullName: string;
    firstName: string;
    email: string;
  };
  summary: CaregiverDashboardSummary;
  patients: CaregiverDashboardPatient[];
  recentNotifications: CaregiverDashboardNotification[];
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Request failed.";
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || "Request failed.";
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || "Request failed.";
  return "Request failed.";
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

export const caregiverDashboardApi = {
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/caregiver/dashboard`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    let result: ApiResponse<CaregiverDashboardData> | any = {};

    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));
    return result.data as CaregiverDashboardData;
  },
};
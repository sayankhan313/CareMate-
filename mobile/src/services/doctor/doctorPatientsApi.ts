import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorVitalStatus = "STABLE" | "WARNING" | "CRITICAL";
export type DoctorAssignmentType = "PRIMARY" | "SPECIALIST";

export type DoctorPatientPrivacyAccess = {
  shareVitalsWithAssignedDoctors: boolean;
  shareMedicinesWithAssignedDoctors: boolean;
  shareReportsWithAssignedDoctors: boolean;
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

export type DoctorPatientBasicInfo = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  healthRecordNumber: string | null;
  bloodGroup: string | null;
  medicalConditions: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  addressLine: string | null;
  postcode: string | null;
};

export type DoctorPatientActiveAlert = {
  id: string;
  status: string;
  reason: string;
  timerEndsAt: string;
  createdAt: string;
};

export type DoctorAssignedPatient = {
  assignmentId: string;
  assignmentType: DoctorAssignmentType;
  assignedAt: string;
  patient: DoctorPatientBasicInfo;
  privacy: DoctorPatientPrivacyAccess;
  latestVital: DoctorVitalReading | null;
  activeMedicineCount: number;
  activeAlert: DoctorPatientActiveAlert | null;
};

export type DoctorAssignedPatientsData = {
  patients: DoctorAssignedPatient[];
};

export type DoctorVitalSummary = {
  label: string;
  value: string;
  status: DoctorVitalStatus;
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
  vitalSummary: DoctorVitalSummary | null;
  consultation: {
    id: string;
    type: "EMERGENCY" | "MANUAL" | string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
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
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
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

export type DoctorPatientMedicine = {
  id: string;
  name: string;
  dose: string;
  instructions: string | null;
  source: "MANUAL" | "SCANNER" | "DOCTOR_PRESCRIBED" | string;
  isActive: boolean;
  createdAt: string;
  reminders: {
    id: string;
    frequency: string;
    customFrequency: string | null;
    timeOfDay: string;
    startDate: string;
    endDate: string | null;
    sendToDoctorForReview: boolean;
    reviewStatus: string;
    isActive: boolean;
  }[];
};

export type DoctorPatientDoseLog = {
  id: string;
  scheduledFor: string;
  status: "PENDING" | "TAKEN" | "MISSED" | "SNOOZED" | string;
  takenAt: string | null;
  snoozedUntil: string | null;
  medicine: {
    id: string;
    name: string;
    dose: string;
  };
  reminder: {
    id: string;
    timeOfDay: string;
    frequency: string;
  };
};

export type DoctorPatientNote = {
  id: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DoctorPatientDetailData = {
  assignment: {
    id: string;
    assignmentType: DoctorAssignmentType;
    assignedAt: string;
  };
  patient: DoctorPatientBasicInfo;
  privacy: DoctorPatientPrivacyAccess;
  summary: {
    activeMedicineCount: number;
    todayDoseCount: number;
    missedDoseCount: number;
    snoozedDoseCount: number;
    pendingMedicineReviews: number;
    hasActiveAlert: boolean;
  };
  latestVital: DoctorVitalReading | null;
  vitalsHistory: DoctorVitalReading[];
  activeMedicines: DoctorPatientMedicine[];
  todayDoseLogs: DoctorPatientDoseLog[];
  latestNotes: DoctorPatientNote[];
  activeAlert: DoctorUrgentAlert | null;
  recentConsultations: DoctorUpcomingConsultation[];
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

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const doctorPatientsApi = {
  async getAssignedPatients() {
    const response = await fetch(`${API_BASE_URL}/doctor/patients`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<DoctorAssignedPatientsData> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data as DoctorAssignedPatientsData;
  },

  async getPatientDetail(patientId: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/patients/${patientId}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<DoctorPatientDetailData> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data as DoctorPatientDetailData;
  },
};
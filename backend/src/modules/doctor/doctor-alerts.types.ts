export type DoctorSafetyAlertStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "ESCALATED"
  | "RESOLVED";

export type DoctorAlertPatient = {
  id: string;
  fullName: string;
  email: string;
};

export type DoctorAlertVitalReading = {
  id: string;
  heartRate: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucose: number | null;
  temperature: number | null;
  status: string;
  source: string;
  deviceSource: string | null;
  recordedAt: Date;
};

export type DoctorAlertConsultation = {
  id: string;
  type: string;
  status: string;
  reason: string;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
};

export type DoctorSafetyAlertResponse = {
  id: string;
  patientId: string;
  doctorId: string | null;
  vitalReadingId: string | null;
  status: DoctorSafetyAlertStatus;
  reason: string;
  timerEndsAt: Date;
  cancelledAt: Date | null;
  escalatedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient: DoctorAlertPatient | null;
  vitalReading: DoctorAlertVitalReading | null;
  consultation: DoctorAlertConsultation | null;
  canAcceptConsultation: boolean;
  canJoinCall: boolean;
  canResolveAlert: boolean;
};

export type DoctorAlertsResponse = {
  alerts: DoctorSafetyAlertResponse[];
};

export type DoctorAlertDetailResponse = {
  alert: DoctorSafetyAlertResponse;
};

export type ResolveDoctorAlertResponse = {
  alert: DoctorSafetyAlertResponse;
};
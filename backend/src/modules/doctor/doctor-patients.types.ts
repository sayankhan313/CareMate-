export type DoctorVitalStatus = "STABLE" | "WARNING" | "CRITICAL";

export type DoctorVitalReadingResponse = {
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
  recordedAt: Date;
};

export type DoctorPatientBasicInfo = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  medicalConditions: string | null;
  emergencyContact: string | null;
};

export type DoctorPatientActiveAlert = {
  id: string;
  status: string;
  reason: string;
  timerEndsAt: Date;
  createdAt: Date;
};

export type DoctorAssignedPatient = {
  assignmentId: string;
  assignedAt: Date;
  patient: DoctorPatientBasicInfo;
  latestVital: DoctorVitalReadingResponse | null;
  activeMedicineCount: number;
  activeAlert: DoctorPatientActiveAlert | null;
};

export type DoctorAssignedPatientsResponse = {
  patients: DoctorAssignedPatient[];
};

export type DoctorVitalSummary = {
  label: string;
  value: string;
  status: DoctorVitalStatus;
};

export type DoctorAlertResponse = {
  id: string;
  patientId: string;
  doctorId: string | null;
  status: string;
  reason: string;
  timerEndsAt: Date;
  escalatedAt: Date | null;
  createdAt: Date;
  patient: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  vitalSummary: DoctorVitalSummary | null;
  consultation: {
    id: string;
    type: string;
    status: string;
    reason: string;
    createdAt: Date;
  } | null;
  canJoinCall: boolean;
};

export type DoctorConsultationResponse = {
  id: string;
  patientId: string;
  doctorId: string | null;
  safetyAlertId: string | null;
  type: string;
  status: string;
  reason: string;
  preferredAt: Date | null;
  notes: string | null;
  doctorName: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export type DoctorPatientMedicineResponse = {
  id: string;
  name: string;
  dose: string;
  instructions: string | null;
  source: string;
  isActive: boolean;
  createdAt: Date;
  reminders: {
    id: string;
    frequency: string;
    customFrequency: string | null;
    timeOfDay: string;
    startDate: Date;
    endDate: Date | null;
    sendToDoctorForReview: boolean;
    reviewStatus: string;
    isActive: boolean;
  }[];
};

export type DoctorPatientDoseLogResponse = {
  id: string;
  scheduledFor: Date;
  status: string;
  takenAt: Date | null;
  snoozedUntil: Date | null;
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

export type DoctorPatientNoteResponse = {
  id: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorPatientDetailResponse = {
  assignment: {
    id: string;
    assignedAt: Date;
  };
  patient: DoctorPatientBasicInfo;
  summary: {
    activeMedicineCount: number;
    todayDoseCount: number;
    missedDoseCount: number;
    snoozedDoseCount: number;
    pendingMedicineReviews: number;
    hasActiveAlert: boolean;
  };
  latestVital: DoctorVitalReadingResponse | null;
  vitalsHistory: DoctorVitalReadingResponse[];
  activeMedicines: DoctorPatientMedicineResponse[];
  todayDoseLogs: DoctorPatientDoseLogResponse[];
  latestNotes: DoctorPatientNoteResponse[];
  activeAlert: DoctorAlertResponse | null;
  recentConsultations: DoctorConsultationResponse[];
};
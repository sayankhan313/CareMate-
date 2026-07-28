export type DoctorConsultationPatient = {
  id: string;
  fullName: string;
  email: string;
};

export type DoctorMeetingConfig = {
  domain: string;
  appId: string;
  roomName: string;
  jwt: string;
  webUrl: string;
  userRole: "PATIENT" | "DOCTOR";
  moderator: boolean;
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
  patient: DoctorConsultationPatient | null;
  canJoinCall: boolean;
};

export type DoctorConsultationsResponse = {
  consultations: DoctorConsultationResponse[];
};

export type DoctorConsultationDetailResponse = {
  consultation: DoctorConsultationResponse;
};

export type DoctorConsultationActionInput = {
  notes?: string;
};

export type DoctorConsultationActionResponse = {
  consultation: DoctorConsultationResponse;
};

export type DoctorJoinConfigResponse = {
  consultation: DoctorConsultationResponse;
  doctorMeeting: DoctorMeetingConfig;
};
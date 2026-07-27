export type DoctorReportCategory =
  | "BLOOD_TEST"
  | "SCAN_XRAY"
  | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY"
  | "MEDICAL_LETTER"
  | "OTHER_MEDICAL_REPORT";

export type DoctorPatientReportStatus =
  | "PENDING_REVIEW"
  | "PARTIALLY_REVIEWED"
  | "REVIEWED";

export type DoctorReportReviewStatus =
  | "PENDING"
  | "REVIEWED";

export type DoctorReportContentSafetyStatus =
  | "NOT_SCANNED"
  | "CLEAR"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type ReviewPatientReportInput = {
  reviewNote: string;
};

export type DoctorReportPatientSummary = {
  id: string;
  fullName: string;
  email: string;
};

export type DoctorReportReviewResponse = {
  id: string;
  doctorId: string;
  status: DoctorReportReviewStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  patientSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorPatientReportResponse = {
  id: string;
  patientId: string;
  title: string;
  category: DoctorReportCategory;
  description: string | null;
  reportDate: Date | null;
  status: DoctorPatientReportStatus;

  originalFileName: string;
  mimeType: string;
  fileSize: number;

  contentSafetyStatus: DoctorReportContentSafetyStatus;
  contentSafetyMessage: string | null;
  contentSafetyCheckedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;

  patient: DoctorReportPatientSummary;
  review: DoctorReportReviewResponse;
};

export type DoctorPatientReportsListResponse = {
  reports: DoctorPatientReportResponse[];

  summary: {
    total: number;
    pending: number;
    reviewed: number;
    blocked: number;
  };
};

export type DoctorReportFileResponse = {
  absolutePath: string;
  originalFileName: string;
  mimeType: string;
};
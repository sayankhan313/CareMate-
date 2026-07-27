export type PatientReportCategory =
  | "BLOOD_TEST"
  | "SCAN_XRAY"
  | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY"
  | "MEDICAL_LETTER"
  | "OTHER_MEDICAL_REPORT";

export type PatientReportStatus =
  | "PENDING_REVIEW"
  | "PARTIALLY_REVIEWED"
  | "REVIEWED";

export type PatientReportReviewStatus =
  | "PENDING"
  | "REVIEWED";

export type PatientReportContentSafetyStatus =
  | "NOT_SCANNED"
  | "CLEAR"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type CreatePatientReportInput = {
  title: string;
  category: PatientReportCategory;
  description?: string;
  reportDate?: string;
  confirmSampleData: boolean;
};

export type UploadedPatientReportFile = {
  path: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export type PatientReportDoctorSummary = {
  id: string;
  fullName: string;
  specialization: string | null;
};

export type PatientReportReviewResponse = {
  id: string;
  doctorId: string;
  status: PatientReportReviewStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  patientSeenAt: Date | null;

  doctor: PatientReportDoctorSummary;
};

export type PatientReportResponse = {
  id: string;
  title: string;
  category: PatientReportCategory;
  description: string | null;
  reportDate: Date | null;
  status: PatientReportStatus;

  originalFileName: string;
  mimeType: string;
  fileSize: number;

  contentSafetyStatus: PatientReportContentSafetyStatus;
  contentSafetyMessage: string | null;
  contentSafetyCheckedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;

  isUnread: boolean;

  reviewSummary: {
    total: number;
    pending: number;
    reviewed: number;
    unread: number;
  };

  reviews: PatientReportReviewResponse[];
};

export type PatientReportsListResponse = {
  reports: PatientReportResponse[];

  summary: {
    total: number;
    pending: number;
    partiallyReviewed: number;
    reviewed: number;
    unreadReviews: number;
  };
};

export type PatientReportFileResponse = {
  absolutePath: string;
  originalFileName: string;
  mimeType: string;
};
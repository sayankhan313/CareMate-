export type DoctorMedicineReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";

export type DoctorMedicineReviewRequestType =
  | "ADD"
  | "DELETE";

export type DoctorMedicineReviewResponse = {
  id: string;
  medicineId: string;
  patientId: string;
  reviewDoctorId: string;
  reviewedByDoctorId: string | null;
  requestType: DoctorMedicineReviewRequestType;
  reviewStatus: DoctorMedicineReviewStatus;
  patientReason: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  patientSeenAt: Date | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  frequency: string;
  customFrequency: string | null;
  timeOfDay: string;
  startDate: Date | null;
  endDate: Date | null;

  patient: {
    id: string;
    fullName: string;
    email: string;
  };

  medicine: {
    id: string;
    name: string;
    dose: string;
    instructions: string | null;
    source: string;
    isActive: boolean;
  };

  reviewedByDoctor: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  canApprove: boolean;
  canReject: boolean;
};

export type DoctorMedicineReviewsResponse = {
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
    additions: number;
    deletions: number;
  };
  reviews: DoctorMedicineReviewResponse[];
};

export type DoctorMedicineReviewDetailResponse = {
  review: DoctorMedicineReviewResponse;
};

export type DoctorMedicineReviewActionResponse = {
  review: DoctorMedicineReviewResponse;
};
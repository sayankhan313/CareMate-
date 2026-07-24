export type DoctorMedicineReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type DoctorMedicineReviewResponse = {
  id: string;
  medicineId: string;
  patientId: string;
  reviewDoctorId: string | null;
  reviewedByDoctorId: string | null;
  frequency: string;
  customFrequency: string | null;
  timeOfDay: string;
  startDate: Date;
  endDate: Date | null;
  reviewStatus: DoctorMedicineReviewStatus;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  };
  reviews: DoctorMedicineReviewResponse[];
};

export type DoctorMedicineReviewDetailResponse = {
  review: DoctorMedicineReviewResponse;
};

export type DoctorMedicineReviewActionResponse = {
  review: DoctorMedicineReviewResponse;
};

export type DoctorMedicineReviewActionInput = {
  note?: string;
};
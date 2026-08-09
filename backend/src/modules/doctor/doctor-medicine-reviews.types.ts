export type DoctorMedicineReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";
export type DoctorMedicineReviewRequestType = "ADD" | "DELETE";
export type DoctorMedicineReviewPoolDecision = "APPROVED" | "REJECTED";

export type DoctorMedicineReviewResponse = {
  id: string;
  medicineId: string;
  patientId: string;
  reviewDoctorId: string | null;
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

export type DoctorPoolMedicineReviewResponse = {
  id: string;
  medicineId: string;
  requestType: DoctorMedicineReviewRequestType;
  routingStatus: "POOL_ASSIGNED" | "POOL_REVIEW_COMPLETED";
  patientReason: string | null;
  poolDecision: DoctorMedicineReviewPoolDecision | null;
  poolDoctorNote: string | null;
  poolAssignedAt: Date | null;
  poolReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  medicine: {
    id: string;
    name: string;
    dose: string;
    instructions: string | null;
    source: string;
    frequency: string;
    customFrequency: string | null;
    timeOfDay: string;
    startDate: Date | null;
    endDate: Date | null;
  };

  clinicalContext: {
    patientReference: string;
    age: number | null;
    gender: string | null;
    medicalConditions: string | null;
    allergies: string | null;

    otherActiveMedicines: {
      id: string;
      name: string;
      dose: string;
      instructions: string | null;
      source: string;
    }[];

    latestVitals: {
      heartRate: number | null;
      spo2: number | null;
      bpSystolic: number | null;
      bpDiastolic: number | null;
      glucose: number | null;
      temperature: number | null;
      status: string;
      recordedAt: Date;
    } | null;
  };

  canApprove: boolean;
  canReject: boolean;
};

export type DoctorPoolMedicineReviewsResponse = {
  summary: {
    total: number;
    awaitingReview: number;
    completed: number;
  };
  reviews: DoctorPoolMedicineReviewResponse[];
};

export type DoctorPoolMedicineReviewDetailResponse = {
  review: DoctorPoolMedicineReviewResponse;
};

export type DoctorPoolMedicineReviewActionResponse = {
  message: string;
  review: DoctorPoolMedicineReviewResponse;
};
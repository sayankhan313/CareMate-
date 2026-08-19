export type DoctorPrescriptionSource = "MANUAL" | "SCANNED";

export type DoctorPrescriptionFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

export type DoctorPrescriptionItemInput = {
  name: string;
  dose: string;
  quantity: string;
  instructions?: string;
  frequency: DoctorPrescriptionFrequency;
  customFrequency?: string;
  selectedTimes: string[];
  startDate: string;
  endDate?: string;
  prescriptionPattern?: string;
};

export type CreateDoctorPrescriptionInput = {
  source: DoctorPrescriptionSource;
  notes?: string;
  rawDetectedText?: string;
  ocrConfidence?: number;
  items: DoctorPrescriptionItemInput[];
};

export type DoctorPrescriptionItemResponse = {
  id: string;
  prescriptionId: string;
  medicineId: string | null;
  name: string;
  dose: string;
  quantity: string | null;
  instructions: string | null;
  frequency: DoctorPrescriptionFrequency;
  customFrequency: string | null;
  selectedTimes: string[];
  startDate: Date;
  endDate: Date | null;
  prescriptionPattern: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorPrescriptionResponse = {
  id: string;
  patientId: string;
  prescribedByDoctorId: string;
  source: DoctorPrescriptionSource;
  imageUrl: string | null;
  rawDetectedText: string | null;
  ocrConfidence: number | null;
  notes: string | null;
  prescribedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  patient: {
    id: string;
    fullName: string;
    email: string;
  };

  prescribedByDoctor: {
    id: string;
    fullName: string;
    email: string;
    specialization: string | null;
  };

  items: DoctorPrescriptionItemResponse[];
};

export type CreateDoctorPrescriptionResponse = {
  prescription: DoctorPrescriptionResponse;
};

export type DoctorPrescriptionsListResponse = {
  prescriptions: DoctorPrescriptionResponse[];
};

export type DoctorPrescriptionDetailResponse = {
  prescription: DoctorPrescriptionResponse;
};
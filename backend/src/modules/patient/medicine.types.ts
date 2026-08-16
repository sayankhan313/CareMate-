export type MedicineSource = "MANUAL" | "SCANNER" | "DOCTOR_PRESCRIBED";

export type MedicineFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

export type CreateMedicineInput = {
  name: string;
  dose: string;
  instructions?: string;
  source?: MedicineSource;
  frequency: MedicineFrequency;
  customFrequency?: string;
  timeOfDay?: string;
  selectedTimes?: string[];
  startDate: string;
  endDate?: string;
  sendToDoctorForReview?: boolean;
  hasMedicineOnHand?: boolean;
  currentStock?: number;
  stockUnit?: string;
  lowStockThreshold?: number;
};

export type UpdateMedicineInput = {
  name?: string;
  dose?: string;
  instructions?: string;
  isActive?: boolean;
  frequency?: MedicineFrequency;
  customFrequency?: string;
  timeOfDay?: string;
  startDate?: string;
  endDate?: string;
  sendToDoctorForReview?: boolean;
  hasMedicineOnHand?: boolean;
  currentStock?: number;
  stockUnit?: string | null;
  lowStockThreshold?: number | null;
};

export type RequestMedicineDeletionInput = {
  reason: string;
};

export type ResubmitMedicineReviewInput = {
  name: string;
  dose: string;
  instructions?: string;
  frequency: MedicineFrequency;
  customFrequency?: string;
  timeOfDay: string;
  startDate: string;
  endDate?: string;
};

export type MedicineIdParams = {
  medicineId: string;
};

export type ReminderIdParams = {
  reminderId: string;
};

export type MedicineReviewRequestIdParams = {
  requestId: string;
};

export type SnoozeMedicineInput = {
  snoozedUntil: string;
};
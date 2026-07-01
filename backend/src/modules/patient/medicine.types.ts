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
  timeOfDay: string;
  startDate: string;
  endDate?: string;

  sendToDoctorForReview?: boolean;
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
};

export type MedicineIdParams = {
  medicineId: string;
};

export type ReminderIdParams = {
  reminderId: string;
};

export type SnoozeMedicineInput = {
  snoozedUntil: string;
};
export type ConsultationIdParams = {
  consultationId: string;
};

export type DoctorAvailabilityParams = {
  doctorId: string;
};

export type DoctorAvailabilityMonthQuery = {
  month: string;
};

export type DoctorAvailabilitySlotsQuery = {
  date: string;
};

export type CreateManualConsultationInput = {
  doctorId: string;
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
};

export type RescheduleConsultationInput = {
  preferredDate: string;
  preferredTime: string;
};

export type PatientAppointmentSlot = {
  time: string;
  startsAt: string;
  durationMinutes: number;
};

export type PatientCalendarDate = {
  date: string;
  isAvailable: boolean;
  availableSlotCount: number;
};

export type PatientDoctorMonthlyAvailability = {
  month: string;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  dates: PatientCalendarDate[];
};

export type PatientDoctorAvailableSlots = {
  date: string;
  isAvailable: boolean;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  slots: PatientAppointmentSlot[];
};
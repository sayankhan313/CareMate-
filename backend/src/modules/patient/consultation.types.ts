export type ConsultationIdParams = {
  consultationId: string;
};

export type CreateManualConsultationInput = {
  doctorId: string;
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
};
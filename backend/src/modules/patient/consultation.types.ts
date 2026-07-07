export type ConsultationIdParams = {
  consultationId: string;
};

export type CreateManualConsultationInput = {
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
};
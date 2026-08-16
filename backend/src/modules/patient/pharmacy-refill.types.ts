export type CreatePharmacyRefillInput = {
  medicineId: string;
  requestedQuantity: number;
  quantityUnit: string;
  note?: string;
};

export type PharmacyRefillResponse = {
  submission: {
    id: string;
    requestType: "REFILL_REQUEST";
    status: string;
    medicineId: string;
  };
  order: {
    id: string;
    orderNumber: string | null;
    status: string;
    orderSource: "REFILL_REQUEST";
    prescriptionConfirmed: boolean;
    fulfilmentAllowed: boolean;
  };
  pharmacy: {
    id: string;
    pharmacyName: string;
  };
  medicine: {
    id: string;
    name: string;
    dose: string;
    source: string;
  };
  requiresPharmacyVerification: boolean;
};
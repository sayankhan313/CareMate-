import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  medicineReferenceFindMany: vi.fn(),
  medicineCreate: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    medicineReference: {
      findMany: mocks.medicineReferenceFindMany,
    },
    medicine: {
      create: mocks.medicineCreate,
    },
  },
}));

import { medicineReferenceService } from "../src/modules/patient/medicine-reference.service.js";

const paracetamol = {
  id: "medicine-ref-001",
  slug: "paracetamol",
  brandName: "Paracetamol",
  genericName: "Paracetamol",
  aliases: ["Panadol"],
  commonStrengths: ["500 mg"],
  form: "Tablet",
  category: "Pain relief",
  usedFor: "Pain and fever",
  commonSideEffects: ["Nausea"],
  defaultInstructions: "Take as directed.",
  defaultFrequency: "ONCE_DAILY",
  defaultTimeOfDay: "08:00",
  safetyLevel: "STANDARD",
  safetyNote: "Follow the recommended dose.",
  imageUrl: null,
  imageAltText: null,
};

const amoxicillin = {
  id: "medicine-ref-002",
  slug: "amoxicillin",
  brandName: "Amoxicillin",
  genericName: "Amoxicillin",
  aliases: ["Amoxil"],
  commonStrengths: ["250 mg", "500 mg"],
  form: "Capsule",
  category: "Antibiotic",
  usedFor: "Bacterial infections",
  commonSideEffects: ["Nausea", "Diarrhoea"],
  defaultInstructions: "Take exactly as prescribed.",
  defaultFrequency: "THREE_TIMES_DAILY",
  defaultTimeOfDay: "08:00",
  safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
  safetyNote: "Clinical review is recommended.",
  imageUrl: null,
  imageAltText: null,
};

describe("CareMate+ OCR and medicine-reference matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.medicineReferenceFindMany.mockResolvedValue([
      paracetamol,
      amoxicillin,
    ]);
  });

  it("AUT-OCR-01: confidently matches a known medicine and extracts its dose", async () => {
    const result = await medicineReferenceService.parseMedicineScan({
      detectedText: "Paracetamol 500 mg tablets",
      ocrConfidence: 94,
    });

    expect(result.matched).toBe(true);
    expect(result.matchStatus).toBe("MATCHED");
    expect(result.matchConfidence).toBeGreaterThanOrEqual(70);

    expect(result.brandName).toBe("Paracetamol");
    expect(result.genericName).toBe("Paracetamol");
    expect(result.dose).toBe("500 mg");
    expect(result.ocrConfidence).toBe(94);

    expect(result.medicineDraft).toMatchObject({
      name: "Paracetamol",
      dose: "500 mg",
      frequency: "ONCE_DAILY",
      timeOfDay: "08:00",
      sendToDoctorForReview: false,
    });
  });

  it("AUT-OCR-02: returns NOT_FOUND and requires review for an unknown medicine", async () => {
    const result = await medicineReferenceService.parseMedicineScan({
      detectedText: "Qzxvtr Unknown Medicine 275 mg",
      ocrConfidence: 61,
    });

    expect(result.matched).toBe(false);
    expect(result.matchStatus).toBe("NOT_FOUND");
    expect(result.matchConfidence).toBe(0);
    expect(result.matchReason).toBe("no-match");

    expect(result.safetyLevel).toBe(
      "DOCTOR_REVIEW_RECOMMENDED",
    );

    expect(result.medicineReference).toBeNull();

    expect(result.medicineDraft.sendToDoctorForReview).toBe(true);
  });

  it("AUT-OCR-03: converts prescription pattern 1-0-1 into morning and night reminders", async () => {
    const result =
      await medicineReferenceService.parsePrescriptionScan({
        detectedText: "Paracetamol 500 mg 1-0-1",
        ocrConfidence: 90,
      });

    expect(result.medicines).toHaveLength(1);

    const medicine = result.medicines[0];

    expect(medicine.brandName).toBe("Paracetamol");
    expect(medicine.dose).toBe("500 mg");

    expect(medicine.prescriptionSchedule).toMatchObject({
      pattern: "1-0-1",
      morning: true,
      afternoon: false,
      night: true,
      frequency: "TWICE_DAILY",
      selectedTimes: ["08:00", "20:00"],
    });

    expect(medicine.medicineDraft.frequency).toBe(
      "TWICE_DAILY",
    );

    expect(medicine.medicineDraft.selectedTimes).toEqual([
      "08:00",
      "20:00",
    ]);
  });

  it("AUT-OCR-04: flags a prescription for Doctor review when the dose is not detected", async () => {
    const result =
      await medicineReferenceService.parsePrescriptionScan({
        detectedText: "Paracetamol 1-0-1",
        ocrConfidence: 88,
      });

    expect(result.medicines).toHaveLength(1);

    const medicine = result.medicines[0];

    expect(medicine.brandName).toBe("Paracetamol");
    expect(medicine.dose).toBe("Dose not detected");

    expect(medicine.safetyLevel).toBe(
      "DOCTOR_REVIEW_RECOMMENDED",
    );

    expect(medicine.medicineDraft.sendToDoctorForReview).toBe(
      true,
    );

    expect(medicine.safetyNote).toContain(
      "Dose was not detected",
    );
  });

  it("AUT-OCR-05: preserves Doctor-review requirement for a safety-sensitive catalogue medicine", async () => {
    const result = await medicineReferenceService.parseMedicineScan({
      detectedText: "Amoxicillin 500 mg capsule",
      ocrConfidence: 95,
    });

    expect(result.matched).toBe(true);
    expect(result.matchStatus).toBe("MATCHED");
    expect(result.brandName).toBe("Amoxicillin");
    expect(result.dose).toBe("500 mg");

    expect(result.safetyLevel).toBe(
      "DOCTOR_REVIEW_RECOMMENDED",
    );

    expect(result.medicineDraft.sendToDoctorForReview).toBe(true);
  });

  it("AUT-OCR-06: removes duplicate medicines detected twice in the same prescription scan", async () => {
    const result =
      await medicineReferenceService.parsePrescriptionScan({
        detectedText:
          "Paracetamol 500 mg 1-0-1\nParacetamol 500 mg 1-0-1",
        ocrConfidence: 92,
      });

    expect(result.medicines).toHaveLength(1);

    expect(result.medicines[0]).toMatchObject({
      brandName: "Paracetamol",
      dose: "500 mg",
    });
  });

  it("AUT-OCR-07: parses different medicines from separate prescription lines", async () => {
    const result =
      await medicineReferenceService.parsePrescriptionScan({
        detectedText:
          "Paracetamol 500 mg 1-0-1\nAmoxicillin 250 mg 1-1-1",
        ocrConfidence: 91,
      });

    expect(result.medicines).toHaveLength(2);

    expect(
      result.medicines.map(medicine => medicine.brandName),
    ).toEqual(
      expect.arrayContaining([
        "Paracetamol",
        "Amoxicillin",
      ]),
    );

    const paracetamolResult = result.medicines.find(
      medicine => medicine.brandName === "Paracetamol",
    );

    const amoxicillinResult = result.medicines.find(
      medicine => medicine.brandName === "Amoxicillin",
    );

    expect(paracetamolResult?.medicineDraft.selectedTimes).toEqual([
      "08:00",
      "20:00",
    ]);

    expect(amoxicillinResult?.medicineDraft.selectedTimes).toEqual([
      "08:00",
      "13:00",
      "20:00",
    ]);
  });

  it("AUT-OCR-08: returns catalogue search matches ordered by medicine similarity", async () => {
    const result =
      await medicineReferenceService.searchMedicineReferences(
        "Panadol 500 mg",
      );

    expect(result.length).toBeGreaterThan(0);

    expect(result[0]).toMatchObject({
      id: paracetamol.id,
      brandName: "Paracetamol",
      genericName: "Paracetamol",
    });

    expect(result[0]?.matchConfidence).toBeGreaterThanOrEqual(35);
  });

  it("AUT-OCR-09: returns an editable medicine draft without directly persisting a Patient medicine", async () => {
    const result = await medicineReferenceService.parseMedicineScan({
      detectedText: "Paracetamol 500 mg",
      ocrConfidence: 93,
    });

    expect(result.matched).toBe(true);

    expect(result.medicineDraft).toMatchObject({
      name: "Paracetamol",
      dose: "500 mg",
    });

    expect(mocks.medicineReferenceFindMany).toHaveBeenCalled();
    expect(mocks.medicineCreate).not.toHaveBeenCalled();
  });

  it("AUT-OCR-10: retains the supplied OCR confidence in the structured result", async () => {
    const result = await medicineReferenceService.parseMedicineScan({
      detectedText: "Paracetamol 500 mg",
      ocrConfidence: 73,
    });

    expect(result.ocrConfidence).toBe(73);
    expect(result.rawText).toBe("Paracetamol 500 mg");
  });
});

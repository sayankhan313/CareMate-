import { describe, expect, it } from "vitest";
import {
  createMedicineSchema,
  updateMedicineSchema,
} from "../src/modules/patient/medicine.validation.js";

const validMedicine = {
  name: "Paracetamol",
  dose: "500 mg",
  frequency: "TWICE_DAILY" as const,
  timeOfDay: "08:00",
  startDate: "31/08/2026",
  hasMedicineOnHand: true,
  currentStock: 20,
  stockUnit: "tablets",
};

describe("CareMate+ medicine validation rules", () => {
  it("AUT-MED-VAL-01: accepts a valid medicine and applies safe defaults", () => {
    const result = createMedicineSchema.parse(validMedicine);

    expect(result.name).toBe("Paracetamol");
    expect(result.source).toBe("MANUAL");
    expect(result.doseQuantity).toBe(1);
    expect(result.sendToDoctorForReview).toBe(false);
  });

  it("AUT-MED-VAL-02: rejects CUSTOM frequency without a custom frequency description", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      frequency: "CUSTOM",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["customFrequency"],
            message:
              "Custom frequency is required when frequency is CUSTOM.",
          }),
        ]),
      );
    }
  });

  it("AUT-MED-VAL-03: rejects an invalid reminder time", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      timeOfDay: "25:70",
    });

    expect(result.success).toBe(false);
  });

  it("AUT-MED-VAL-04: rejects an invalid date format", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      startDate: "2026-08-31",
    });

    expect(result.success).toBe(false);
  });

  it("AUT-MED-VAL-05: rejects more than four selected reminder times", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      selectedTimes: [
        "06:00",
        "09:00",
        "12:00",
        "15:00",
        "18:00",
      ],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "A maximum of four reminder times is allowed.",
      );
    }
  });

  it("AUT-MED-VAL-06: requires positive stock when medicine is marked as available", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      currentStock: 0,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["currentStock"],
            message:
              "Current stock must be at least 1 when medicine is available.",
          }),
        ]),
      );
    }
  });

  it("AUT-MED-VAL-07: requires a stock unit when medicine is available", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      stockUnit: undefined,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["stockUnit"],
            message:
              "Stock unit is required when medicine is available.",
          }),
        ]),
      );
    }
  });

  it("AUT-MED-VAL-08: rejects non-zero stock when medicine is unavailable", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      hasMedicineOnHand: false,
      currentStock: 5,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["currentStock"],
            message:
              "Current stock must be 0 when medicine is unavailable.",
          }),
        ]),
      );
    }
  });

  it("AUT-MED-VAL-09: rejects a negative stock quantity", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      currentStock: -1,
    });

    expect(result.success).toBe(false);
  });

  it("AUT-MED-VAL-10: rejects an excessive dose quantity", () => {
    const result = createMedicineSchema.safeParse({
      ...validMedicine,
      doseQuantity: 21,
    });

    expect(result.success).toBe(false);
  });

  it("AUT-MED-VAL-11: accepts up to four valid reminder times", () => {
    const result = createMedicineSchema.parse({
      ...validMedicine,
      selectedTimes: [
        "06:00",
        "10:00",
        "14:00",
        "18:00",
      ],
    });

    expect(result.selectedTimes).toHaveLength(4);
  });

  it("AUT-MED-VAL-12: rejects a CUSTOM medicine update without custom frequency text", () => {
    const result = updateMedicineSchema.safeParse({
      frequency: "CUSTOM",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["customFrequency"],
          }),
        ]),
      );
    }
  });
});

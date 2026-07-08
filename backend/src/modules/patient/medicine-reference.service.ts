import { prisma } from "../../config/prisma.js";

const normalizeText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^\w\s+/-]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getTodayDate = () => {
  const today = new Date();

  const day = `${today.getDate()}`.padStart(2, "0");
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
};

const extractDose = (detectedText: string, fallbackDose?: string) => {
  const strengthMatch = detectedText.match(
    /(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|units|%)\s?(?:\+|\/)?\s?\d*(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|units|%)?)/i
  );

  if (strengthMatch?.[1]) {
    return strengthMatch[1].replace(/\s+/g, " ").trim();
  }

  return fallbackDose || "Dose not detected";
};

const extractInstructions = (
  detectedText: string,
  fallbackInstructions?: string
) => {
  const lines = detectedText
    .split(/\n|\.|,/)
    .map((line) => line.trim())
    .filter(Boolean);

 const instructionLine = lines.find((line) => {
  const lowerLine = line.toLowerCase();

  return (
    lowerLine.includes("take") ||
    lowerLine.includes("daily") ||
    lowerLine.includes("after") ||
    lowerLine.includes("before") ||
    lowerLine.includes("food") ||
    lowerLine.includes("meal") ||
    lowerLine.includes("morning") ||
    lowerLine.includes("night") ||
    lowerLine.includes("breakfast") ||
    lowerLine.includes("dinner")
  );
});

if (instructionLine) {
  const takeIndex = instructionLine.toLowerCase().indexOf("take");

  if (takeIndex >= 0) {
    return instructionLine.slice(takeIndex).trim();
  }

  return instructionLine;
}

  return (
    instructionLine ||
    fallbackInstructions ||
    "Take as advised by your doctor or pharmacist."
  );
};

const inferFrequency = (detectedText: string, fallbackFrequency: any) => {
  const text = normalizeText(detectedText);

  if (
    text.includes("as needed") ||
    text.includes("when needed") ||
    text.includes("if required") ||
    text.includes("prn")
  ) {
    return "AS_NEEDED";
  }

  if (
    text.includes("three times") ||
    text.includes("3 times") ||
    text.includes("thrice") ||
    text.includes("tid")
  ) {
    return "THREE_TIMES_DAILY";
  }

  if (
    text.includes("twice") ||
    text.includes("two times") ||
    text.includes("2 times") ||
    text.includes("bid")
  ) {
    return "TWICE_DAILY";
  }

  if (
    text.includes("once") ||
    text.includes("one time") ||
    text.includes("1 time") ||
    text.includes("daily") ||
    text.includes("od")
  ) {
    return "ONCE_DAILY";
  }

  return fallbackFrequency || "ONCE_DAILY";
};

const inferSelectedTimes = (frequency: string, detectedText: string) => {
  const text = normalizeText(detectedText);

  if (
    text.includes("night") ||
    text.includes("bedtime") ||
    text.includes("dinner") ||
    text.includes("evening")
  ) {
    return ["20:00"];
  }

  if (text.includes("lunch") || text.includes("afternoon")) {
    return ["13:00"];
  }

  if (frequency === "TWICE_DAILY") {
    return ["08:00", "20:00"];
  }

  if (frequency === "THREE_TIMES_DAILY") {
    return ["08:00", "13:00", "20:00"];
  }

  return ["08:00"];
};

const getFallbackMedicineName = (detectedText: string) => {
  const firstLine = detectedText
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 2);

  if (!firstLine) {
    return "Unknown medicine";
  }

  const withoutDose = firstLine
    .replace(/\d+(?:\.\d+)?\s?(mg|mcg|g|ml|iu|units|%)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const instructionStartIndex = withoutDose.search(
    /\b(take|once|twice|three|daily|after|before|with|morning|night|breakfast|lunch|dinner)\b/i
  );

  if (instructionStartIndex > 0) {
    return withoutDose.slice(0, instructionStartIndex).trim();
  }

  return withoutDose || "Unknown medicine";
};

const getMedicineMatchScore = (detectedText: string, medicine: any) => {
  const normalizedDetectedText = normalizeText(detectedText);

  const searchableValues = [
    medicine.brandName,
    medicine.genericName,
    ...(medicine.aliases || []),
  ];

  let bestScore = 0;

  for (const value of searchableValues) {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
      continue;
    }

    if (normalizedDetectedText.includes(normalizedValue)) {
      bestScore = Math.max(bestScore, normalizedValue.length);
    }
  }

  return bestScore;
};

const findBestMedicineMatch = async (detectedText: string) => {
  const medicines = await prisma.medicineReference.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      brandName: "asc",
    },
  });

  let bestMedicine: any = null;
  let bestScore = 0;

  for (const medicine of medicines) {
    const score = getMedicineMatchScore(detectedText, medicine);

    if (score > bestScore) {
      bestScore = score;
      bestMedicine = medicine;
    }
  }

  return bestMedicine;
};

const formatMedicine = (medicine: any) => {
  return {
    id: medicine.id,
    slug: medicine.slug,
    brandName: medicine.brandName,
    genericName: medicine.genericName,
    aliases: medicine.aliases,
    commonStrengths: medicine.commonStrengths,
    form: medicine.form,
    category: medicine.category,
    usedFor: medicine.usedFor,
    commonSideEffects: medicine.commonSideEffects,
    defaultInstructions: medicine.defaultInstructions,
    defaultFrequency: medicine.defaultFrequency,
    defaultTimeOfDay: medicine.defaultTimeOfDay,
    safetyLevel: medicine.safetyLevel,
    safetyNote: medicine.safetyNote,
  };
};

export const medicineReferenceService = {
  async searchMedicineReferences(query: string) {
    const medicines = await prisma.medicineReference.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        brandName: "asc",
      },
    });

    const normalizedQuery = normalizeText(query);

    return medicines
      .map((medicine) => {
        const searchableText = normalizeText(
          [
            medicine.brandName,
            medicine.genericName,
            ...(medicine.aliases || []),
          ].join(" ")
        );

        const score = searchableText.includes(normalizedQuery) ? 100 : 0;

        return {
          medicine,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .slice(0, 20)
      .map((item) => formatMedicine(item.medicine));
  },

  async parseMedicineScan({
    detectedText,
    ocrConfidence = 82,
  }: {
    detectedText: string;
    ocrConfidence?: number;
  }) {
    const matchedMedicine = await findBestMedicineMatch(detectedText);

    const detectedName =
      matchedMedicine?.brandName || getFallbackMedicineName(detectedText);

    const dose = extractDose(
      detectedText,
      matchedMedicine?.commonStrengths?.[0]
    );

    const instructions = extractInstructions(
      detectedText,
      matchedMedicine?.defaultInstructions
    );

    const frequency = inferFrequency(
      detectedText,
      matchedMedicine?.defaultFrequency
    );

    const selectedTimes = inferSelectedTimes(frequency, detectedText);

    const matched = Boolean(matchedMedicine);

    const matchConfidence = matched
      ? Math.min(96, Math.max(75, ocrConfidence))
      : Math.min(55, ocrConfidence);

    return {
      rawText: detectedText,
      ocrConfidence,
      matched,
      matchConfidence,

      detectedName,
      brandName: matchedMedicine?.brandName || detectedName,
      genericName: matchedMedicine?.genericName || "Not matched",
      dose,
      form: matchedMedicine?.form || "Not detected",
      category: matchedMedicine?.category || "Needs review",
      usedFor:
        matchedMedicine?.usedFor ||
        "Medicine information is not available in the backend reference catalogue. Please confirm with a doctor or pharmacist.",
      commonSideEffects:
        matchedMedicine?.commonSideEffects?.length > 0
          ? matchedMedicine.commonSideEffects
          : ["Not available"],
      instructions,
      safetyLevel: matchedMedicine?.safetyLevel || "STANDARD",
      safetyNote:
        matchedMedicine?.safetyNote ||
        "This information is for support only. Always follow your doctor or pharmacist advice.",

      medicineReference: matchedMedicine
        ? formatMedicine(matchedMedicine)
        : null,

      medicineDraft: {
        name: matchedMedicine?.brandName || detectedName,
        dose,
        instructions,
        frequency,
        timeOfDay: selectedTimes[0],
        selectedTimes,
        startDate: getTodayDate(),
        endDate: undefined,
        sendToDoctorForReview:
          matchedMedicine?.safetyLevel === "DOCTOR_REVIEW_RECOMMENDED",
      },
    };
  },
};
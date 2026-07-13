import { prisma } from "../../config/prisma.js";

type MedicineFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

type MedicineDraftFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "AS_NEEDED";

type MedicineSafetyLevel = "STANDARD" | "DOCTOR_REVIEW_RECOMMENDED";

type DoseMode = "LABEL_SCAN" | "PRESCRIPTION_SCAN";

type MedicineReferenceRecord = {
  id: string;
  slug: string;
  brandName: string;
  genericName: string;
  aliases: string[];
  commonStrengths: string[];
  form: string;
  category: string;
  usedFor: string;
  commonSideEffects: string[];
  defaultInstructions: string;
  defaultFrequency: MedicineFrequency;
  defaultTimeOfDay: string;
  safetyLevel: MedicineSafetyLevel;
  safetyNote: string;
  imageUrl: string | null;
  imageAltText: string | null;
};

type PrescriptionSchedule = {
  pattern: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  frequency: "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY";
  selectedTimes: string[];
  instructionText: string;
};

type MedicineMatch = {
  medicine: MedicineReferenceRecord;
  score: number;
  reason: string;
};

const CONFIDENT_MATCH_THRESHOLD = 70;
const DISPLAY_MATCH_THRESHOLD = 55;
const CANDIDATE_THRESHOLD = 35;

const DOSE_NOT_DETECTED = "Dose not detected";

const DIRECT_DOSE_REGEX =
  /\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|units|%)\s*(?:\/\s*\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|units|%))?\b/i;

const CFU_DOSE_REGEX =
  /\b\d+(?:\.\d+)?\s?(?:billion|million)?\s?(?:cfu)\b/i;

const NUMBER_REGEX = /\b\d+(?:\.\d+)?\b/g;

const MEDICINE_KEYWORD_REGEX =
  /\b(tab|tablet|cap|capsule|syp|syrup|gel|cream|ointment|drop|drops|inhaler|spray|mg|ml|mcg|iu|cfu|billion|million)\b/i;

const normalizeWhitespace = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const normalizeNameText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[|]/g, "i")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/5/g, "s")
    .replace(/[@]/g, "a")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(
      /\b(tablet|tablets|tab|tabs|capsule|capsules|cap|caps|syrup|syp)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeDoseText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[|il]/g, "1")
    .replace(/[o]/g, "0")
    .replace(/mcq/g, "mcg")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeScheduleText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[iIlL|]/g, "1")
    .replace(/[oO]/g, "0")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
};

const compact = (value: string) => {
  return value.replace(/\s+/g, "");
};

const levenshteinDistance = (firstValue: string, secondValue: string) => {
  const first = firstValue || "";
  const second = secondValue || "";

  const rows = first.length + 1;
  const columns = second.length + 1;

  const matrix = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 0)
  );

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[first.length][second.length];
};

const calculateSimilarity = (firstValue: string, secondValue: string) => {
  const first = normalizeWhitespace(firstValue);
  const second = normalizeWhitespace(secondValue);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 100;
  }

  if (first.includes(second) || second.includes(first)) {
    const shorterLength = Math.min(first.length, second.length);
    const longerLength = Math.max(first.length, second.length);
    const includeScore = Math.round((shorterLength / longerLength) * 100) + 12;

    return Math.min(includeScore, 98);
  }

  const distance = levenshteinDistance(first, second);
  const maxLength = Math.max(first.length, second.length);

  if (maxLength === 0) {
    return 0;
  }

  return Math.max(0, Math.round((1 - distance / maxLength) * 100));
};

const getTokenWindows = (tokens: string[], windowSize: number) => {
  if (windowSize <= 0 || tokens.length < windowSize) {
    return [];
  }

  const windows: string[] = [];

  for (let index = 0; index <= tokens.length - windowSize; index += 1) {
    windows.push(tokens.slice(index, index + windowSize).join(" "));
  }

  return windows;
};

const getMedicineCandidates = (medicine: MedicineReferenceRecord) => {
  const baseNames = [
    medicine.brandName,
    medicine.genericName,
    ...(medicine.aliases || []),
  ].filter(Boolean);

  const strengths = medicine.commonStrengths || [];
  const candidates = new Set<string>();

  for (const name of baseNames) {
    candidates.add(name);
    candidates.add(`${name} ${medicine.form}`);

    for (const strength of strengths) {
      candidates.add(`${name} ${strength}`);
      candidates.add(`${name} ${strength} ${medicine.form}`);
    }
  }

  return Array.from(candidates);
};

const buildPrescriptionScheduleFromDigits = (
  morningDigit: string,
  afternoonDigit: string,
  nightDigit: string
): PrescriptionSchedule | null => {
  const morning = morningDigit === "1";
  const afternoon = afternoonDigit === "1";
  const night = nightDigit === "1";

  const activeCount = [morning, afternoon, night].filter(Boolean).length;

  if (activeCount === 0) {
    return null;
  }

  const selectedTimes: string[] = [];

  if (morning) {
    selectedTimes.push("08:00");
  }

  if (afternoon) {
    selectedTimes.push("13:00");
  }

  if (night) {
    selectedTimes.push("20:00");
  }

  const frequency =
    activeCount === 3
      ? "THREE_TIMES_DAILY"
      : activeCount === 2
      ? "TWICE_DAILY"
      : "ONCE_DAILY";

  const pattern = `${morning ? 1 : 0}-${afternoon ? 1 : 0}-${
    night ? 1 : 0
  }`;

  const activeLabels = [
    morning ? "morning" : null,
    afternoon ? "afternoon" : null,
    night ? "night" : null,
  ].filter(Boolean);

  return {
    pattern,
    morning,
    afternoon,
    night,
    frequency,
    selectedTimes,
    instructionText: `Prescription pattern ${pattern}: take in the ${activeLabels.join(
      " and "
    )}.`,
  };
};

const extractScheduleDigitsFromChunk = (
  chunk: string
): [string, string, string] | null => {
  const normalizedChunk = chunk
    .replace(/[iIlL|]/g, "1")
    .replace(/[oO]/g, "0");

  const digits = normalizedChunk.match(/[01]/g);

  if (!digits || digits.length < 3) {
    return null;
  }

  const firstDigit = digits[0];
  const secondDigit = digits[1];
  const thirdDigit =
    digits.length === 3 ? digits[2] : digits[digits.length - 1];

  if (!firstDigit || !secondDigit || !thirdDigit) {
    return null;
  }

  return [firstDigit, secondDigit, thirdDigit];
};

const extractPrescriptionSchedules = (text: string): PrescriptionSchedule[] => {
  const rawText = text || "";

  const scheduleChunks: {
    index: number;
    end: number;
    text: string;
  }[] = [];

  const chunkPatterns = [
    /[._•·]*[01iIlLoO|][._•·]*\s*[-–—/.]\s*[._•·]*[01iIlLoO|][._•·]*\s*[-–—/.]\s*[._•·]*[01iIlLoO|][._•·]*/g,
    /[._•·]*[01iIlLoO|][._•·]*\s*[-–—/.]\s*[._•·]*[01iIlLoO|]{2,3}[._•·]*/g,
    /[._•·]*[01iIlLoO|]{2}\s*[-–—/.]\s*[._•·]*[01iIlLoO|][._•·]*/g,
    /\b[01iIlLoO|]\s+[01iIlLoO|]\s+[01iIlLoO|]\b/g,
  ];

  for (const pattern of chunkPatterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(rawText)) !== null) {
      scheduleChunks.push({
        index: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }
  }

  const uniqueChunks = scheduleChunks
    .sort((first, second) => {
      if (first.index === second.index) {
        return second.text.length - first.text.length;
      }

      return first.index - second.index;
    })
    .filter((chunk, index, chunks) => {
      const previousChunks = chunks.slice(0, index);

      const overlapsPrevious = previousChunks.some((previous) => {
        return chunk.index < previous.end && chunk.end > previous.index;
      });

      return !overlapsPrevious;
    });

  const schedules: PrescriptionSchedule[] = [];

  for (const chunk of uniqueChunks) {
    const digits = extractScheduleDigitsFromChunk(chunk.text);

    if (!digits) {
      continue;
    }

    const schedule = buildPrescriptionScheduleFromDigits(
      digits[0],
      digits[1],
      digits[2]
    );

    if (!schedule) {
      continue;
    }

    schedules.push(schedule);
  }

  return schedules;
};

const extractPrescriptionSchedule = (
  text: string
): PrescriptionSchedule | null => {
  return extractPrescriptionSchedules(text)[0] || null;
};

const removeScheduleText = (text: string) => {
  let cleanedText = text;

  const schedulePatterns = [
    /[._•·]*[01iIlLoO|][._•·]*\s*[-–—/.]\s*[._•·]*[01iIlLoO|][._•·]*\s*[-–—/.]\s*[._•·]*[01iIlLoO|][._•·]*/g,
    /[._•·]*[01iIlLoO|][._•·]*\s*[-–—/.]\s*[._•·]*[01iIlLoO|]{2,3}[._•·]*/g,
    /[._•·]*[01iIlLoO|]{2}\s*[-–—/.]\s*[._•·]*[01iIlLoO|][._•·]*/g,
    /\b[01iIlLoO|]\s+[01iIlLoO|]\s+[01iIlLoO|]\b/g,
  ];

  for (const pattern of schedulePatterns) {
    cleanedText = cleanedText.replace(pattern, " ");
  }

  return normalizeWhitespace(cleanedText);
};

const cleanDoseValue = (dose: string) => {
  return dose.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
};

const extractDirectDoseFromText = (text: string) => {
  const normalizedText = normalizeDoseText(text);

  const cfuMatch = normalizedText.match(CFU_DOSE_REGEX);

  if (cfuMatch) {
    return cleanDoseValue(
      cfuMatch[0]
        .replace(/\bcfu\b/i, "CFU")
        .replace(/\bbillion\b/i, "billion")
        .replace(/\bmillion\b/i, "million")
    );
  }

  const doseMatch = normalizedText.match(DIRECT_DOSE_REGEX);

  if (doseMatch) {
    return cleanDoseValue(doseMatch[0]);
  }

  return null;
};

const getNumbersFromText = (text: string) => {
  return normalizeDoseText(text).match(NUMBER_REGEX) || [];
};

const getMainNumberFromStrength = (strength: string) => {
  return normalizeDoseText(strength).match(NUMBER_REGEX)?.[0] || null;
};

const matchNumberToMedicineStrength = (
  text: string,
  medicine: MedicineReferenceRecord | null
) => {
  if (!medicine?.commonStrengths?.length) {
    return null;
  }

  const textWithoutSchedule = removeScheduleText(text);
  const numbers = getNumbersFromText(textWithoutSchedule);

  if (numbers.length === 0) {
    return null;
  }

  for (const number of numbers) {
    const numericValue = Number(number);

    if (!Number.isFinite(numericValue) || numericValue <= 2) {
      continue;
    }

    const matchingStrength = medicine.commonStrengths.find((strength) => {
      const strengthNumber = getMainNumberFromStrength(strength);

      return strengthNumber === number;
    });

    if (matchingStrength) {
      return matchingStrength;
    }
  }

  return null;
};

const extractDose = ({
  text,
  medicine,
  mode,
}: {
  text: string;
  medicine: MedicineReferenceRecord | null;
  mode: DoseMode;
}) => {
  const textWithoutSchedule =
    mode === "PRESCRIPTION_SCAN" ? removeScheduleText(text) : text;

  const directDose = extractDirectDoseFromText(textWithoutSchedule);

  if (directDose) {
    return directDose;
  }

  const numericStrengthMatch = matchNumberToMedicineStrength(
    textWithoutSchedule,
    medicine
  );

  if (numericStrengthMatch) {
    return numericStrengthMatch;
  }

  if (mode === "PRESCRIPTION_SCAN") {
    return DOSE_NOT_DETECTED;
  }

  if (medicine?.commonStrengths?.length) {
    return medicine.commonStrengths[0];
  }

  return "As prescribed";
};

const getStrengthBonus = (
  inputText: string,
  medicine: MedicineReferenceRecord
) => {
  const normalizedInput = compact(
    normalizeDoseText(removeScheduleText(inputText))
  );

  if (!normalizedInput) {
    return 0;
  }

  const detectedDose = extractDose({
    text: inputText,
    medicine,
    mode: "LABEL_SCAN",
  });

  for (const strength of medicine.commonStrengths || []) {
    const normalizedStrength = compact(normalizeDoseText(strength));

    if (normalizedStrength && normalizedInput.includes(normalizedStrength)) {
      return 8;
    }

    if (
      detectedDose &&
      detectedDose !== DOSE_NOT_DETECTED &&
      compact(normalizeDoseText(detectedDose)) === normalizedStrength
    ) {
      return 8;
    }
  }

  if (detectedDose && detectedDose !== DOSE_NOT_DETECTED) {
    return 3;
  }

  return 0;
};

const getMedicineMatchScore = (
  inputText: string,
  medicine: MedicineReferenceRecord
) => {
  const normalizedInput = normalizeNameText(inputText);
  const compactInput = compact(normalizedInput);
  const inputTokens = normalizedInput.split(" ").filter(Boolean);

  let bestScore = 0;
  let bestReason = "fuzzy";

  const candidates = getMedicineCandidates(medicine);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeNameText(candidate);
    const compactCandidate = compact(normalizedCandidate);

    if (!normalizedCandidate || !compactCandidate) {
      continue;
    }

    if (normalizedInput.includes(normalizedCandidate)) {
      bestScore = Math.max(bestScore, 96);
      bestReason = "contains-name";
      continue;
    }

    if (compactInput.includes(compactCandidate)) {
      bestScore = Math.max(bestScore, 95);
      bestReason = "compact-name";
      continue;
    }

    const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);

    if (candidateTokens.length === 1) {
      for (const inputToken of inputTokens) {
        const tokenScore = calculateSimilarity(inputToken, candidateTokens[0]);

        if (tokenScore > bestScore) {
          bestScore = tokenScore;
          bestReason = "single-token-fuzzy";
        }
      }

      continue;
    }

    const sameSizeWindows = getTokenWindows(inputTokens, candidateTokens.length);
    const biggerWindows = getTokenWindows(
      inputTokens,
      candidateTokens.length + 1
    );

    const windows = [...sameSizeWindows, ...biggerWindows];

    for (const windowText of windows) {
      const windowScore = calculateSimilarity(windowText, normalizedCandidate);

      if (windowScore > bestScore) {
        bestScore = windowScore;
        bestReason = "phrase-fuzzy";
      }
    }

    const fullLineScore = calculateSimilarity(
      normalizedInput,
      normalizedCandidate
    );

    if (fullLineScore > bestScore) {
      bestScore = fullLineScore;
      bestReason = "full-line-fuzzy";
    }
  }

  const strengthBonus = getStrengthBonus(inputText, medicine);
  const finalScore = Math.min(99, bestScore + strengthBonus);

  return {
    score: finalScore,
    reason: strengthBonus > 0 ? `${bestReason}+strength` : bestReason,
  };
};

const findMedicineMatches = (
  inputText: string,
  medicines: MedicineReferenceRecord[]
) => {
  return medicines
    .map((medicine) => {
      const result = getMedicineMatchScore(inputText, medicine);

      return {
        medicine,
        score: result.score,
        reason: result.reason,
      };
    })
    .filter((match) => match.score >= CANDIDATE_THRESHOLD)
    .sort((first, second) => second.score - first.score);
};

const findBestMedicineMatch = (
  inputText: string,
  medicines: MedicineReferenceRecord[]
): MedicineMatch | null => {
  const matches = findMedicineMatches(inputText, medicines);

  return matches[0] || null;
};

const formatMedicineReference = (medicine: MedicineReferenceRecord) => {
  return {
    id: medicine.id,
    slug: medicine.slug,
    brandName: medicine.brandName,
    genericName: medicine.genericName,
    aliases: medicine.aliases || [],
    commonStrengths: medicine.commonStrengths || [],
    form: medicine.form,
    category: medicine.category,
    usedFor: medicine.usedFor,
    commonSideEffects: medicine.commonSideEffects || [],
    defaultInstructions: medicine.defaultInstructions,
    defaultFrequency: medicine.defaultFrequency,
    defaultTimeOfDay: medicine.defaultTimeOfDay,
    safetyLevel: medicine.safetyLevel,
    safetyNote: medicine.safetyNote,
    imageUrl: medicine.imageUrl,
    imageAltText: medicine.imageAltText,
  };
};

const getSuggestedMatches = (
  inputText: string,
  medicines: MedicineReferenceRecord[]
) => {
  return findMedicineMatches(inputText, medicines)
    .slice(0, 3)
    .map((match) => ({
      ...formatMedicineReference(match.medicine),
      matchConfidence: match.score,
      matchReason: match.reason,
    }));
};

const normalizeDraftFrequency = (
  frequency: MedicineFrequency
): MedicineDraftFrequency => {
  if (
    frequency === "ONCE_DAILY" ||
    frequency === "TWICE_DAILY" ||
    frequency === "THREE_TIMES_DAILY" ||
    frequency === "AS_NEEDED"
  ) {
    return frequency;
  }

  return "ONCE_DAILY";
};

const getDefaultTimesForFrequency = (
  frequency: MedicineDraftFrequency,
  defaultTimeOfDay: string
) => {
  if (frequency === "TWICE_DAILY") {
    return ["08:00", "20:00"];
  }

  if (frequency === "THREE_TIMES_DAILY") {
    return ["08:00", "13:00", "20:00"];
  }

  return [defaultTimeOfDay || "08:00"];
};

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const buildMatchedMedicineResult = ({
  text,
  lineText,
  ocrConfidence,
  match,
  schedule,
  allMedicines,
  doseMode,
}: {
  text: string;
  lineText?: string;
  ocrConfidence: number;
  match: MedicineMatch;
  schedule: PrescriptionSchedule | null;
  allMedicines: MedicineReferenceRecord[];
  doseMode: DoseMode;
}) => {
  const medicine = match.medicine;

  const dose = extractDose({
    text,
    medicine,
    mode: doseMode,
  });

  const isConfidentMatch = match.score >= CONFIDENT_MATCH_THRESHOLD;

  const draftFrequency = schedule
    ? schedule.frequency
    : normalizeDraftFrequency(medicine.defaultFrequency);

  const selectedTimes = schedule
    ? schedule.selectedTimes
    : getDefaultTimesForFrequency(draftFrequency, medicine.defaultTimeOfDay);

  const baseSafetyLevel: MedicineSafetyLevel =
    isConfidentMatch && medicine.safetyLevel === "STANDARD"
      ? "STANDARD"
      : "DOCTOR_REVIEW_RECOMMENDED";

  const finalSafetyLevel: MedicineSafetyLevel =
    doseMode === "PRESCRIPTION_SCAN" && dose === DOSE_NOT_DETECTED
      ? "DOCTOR_REVIEW_RECOMMENDED"
      : baseSafetyLevel;

  const doseWarning =
    doseMode === "PRESCRIPTION_SCAN" && dose === DOSE_NOT_DETECTED
      ? " Dose was not detected from the prescription image. Please edit the dose before saving if needed."
      : "";

  const safetyNote = isConfidentMatch
    ? `${medicine.safetyNote}${doseWarning}`
    : `Possible OCR match (${match.score}%). Please verify the medicine name, dose and schedule with the prescription, doctor or pharmacist before saving. ${medicine.safetyNote}${doseWarning}`;

  return {
    rawText: text,
    lineText: lineText || text,
    ocrConfidence,
    matched: true,
    matchStatus: isConfidentMatch ? "MATCHED" : "POSSIBLE_MATCH",
    matchConfidence: match.score,
    matchReason: match.reason,
    detectedName: medicine.brandName,
    brandName: medicine.brandName,
    genericName: medicine.genericName,
    dose,
    form: medicine.form,
    category: medicine.category,
    usedFor: medicine.usedFor,
    commonSideEffects: medicine.commonSideEffects || [],
    instructions: schedule
      ? schedule.instructionText
      : medicine.defaultInstructions,
    prescriptionSchedule: schedule,
    safetyLevel: finalSafetyLevel,
    safetyNote,
    imageUrl: medicine.imageUrl,
    imageAltText: medicine.imageAltText,
    medicineReference: formatMedicineReference(medicine),
    suggestedMatches: getSuggestedMatches(text, allMedicines),
    medicineDraft: {
      name: medicine.brandName,
      dose,
      instructions: schedule
        ? schedule.instructionText
        : medicine.defaultInstructions,
      frequency: draftFrequency,
      timeOfDay: selectedTimes[0],
      selectedTimes,
      startDate: getTodayDate(),
      endDate: undefined,
      prescriptionPattern: schedule?.pattern || null,
      sendToDoctorForReview:
        !isConfidentMatch ||
        finalSafetyLevel === "DOCTOR_REVIEW_RECOMMENDED" ||
        dose === DOSE_NOT_DETECTED,
    },
  };
};

const buildUnmatchedMedicineResult = ({
  text,
  ocrConfidence,
  allMedicines,
  doseMode,
}: {
  text: string;
  ocrConfidence: number;
  allMedicines: MedicineReferenceRecord[];
  doseMode: DoseMode;
}) => {
  const schedule = extractPrescriptionSchedule(text);

  const fallbackName = removeScheduleText(text)
    .replace(DIRECT_DOSE_REGEX, "")
    .replace(CFU_DOSE_REGEX, "")
    .split(" ")
    .filter((word) => word.length > 1)
    .slice(0, 3)
    .join(" ");

  const selectedTimes = schedule?.selectedTimes || ["08:00"];

  const dose = extractDose({
    text,
    medicine: null,
    mode: doseMode,
  });

  return {
    rawText: text,
    ocrConfidence,
    matched: false,
    matchStatus: "NOT_FOUND",
    matchConfidence: 0,
    matchReason: "no-match",
    detectedName: fallbackName || "Unknown medicine",
    brandName: fallbackName || "Unknown medicine",
    genericName: "Unknown",
    dose,
    form: "Unknown",
    category: "Unmatched",
    usedFor: "Please verify with a doctor or pharmacist.",
    commonSideEffects: [],
    instructions:
      schedule?.instructionText ||
      "Please verify the medicine instructions before saving.",
    prescriptionSchedule: schedule,
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED" as MedicineSafetyLevel,
    safetyNote:
      "This medicine could not be confidently matched with the catalogue. Please verify before saving.",
    imageUrl: null,
    imageAltText: null,
    medicineReference: null,
    suggestedMatches: getSuggestedMatches(text, allMedicines),
    medicineDraft: {
      name: fallbackName || "Unknown medicine",
      dose,
      instructions:
        schedule?.instructionText ||
        "Please verify the medicine instructions before saving.",
      frequency: schedule?.frequency || "ONCE_DAILY",
      timeOfDay: selectedTimes[0],
      selectedTimes,
      startDate: getTodayDate(),
      endDate: undefined,
      prescriptionPattern: schedule?.pattern || null,
      sendToDoctorForReview: true,
    },
  };
};

const getCleanPrescriptionLines = (detectedText: string) => {
  return detectedText
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);
};

const attachStandaloneSchedulesToMedicineLines = (
  lines: string[],
  medicines: MedicineReferenceRecord[]
) => {
  const classifiedLines = lines.map((line, index) => {
    const schedules = extractPrescriptionSchedules(line);
    const lineWithoutSchedule = removeScheduleText(line);
    const bestMatch = findBestMedicineMatch(
      lineWithoutSchedule || line,
      medicines
    );

    const isScheduleOnly =
      schedules.length > 0 &&
      (!lineWithoutSchedule ||
        lineWithoutSchedule.length <= 2 ||
        !bestMatch ||
        bestMatch.score < CANDIDATE_THRESHOLD);

    const isMedicineLine =
      Boolean(bestMatch && bestMatch.score >= CANDIDATE_THRESHOLD) &&
      !isScheduleOnly;

    return {
      index,
      line,
      schedules,
      lineWithoutSchedule,
      bestMatch,
      isScheduleOnly,
      isMedicineLine,
    };
  });

  const medicineLines = classifiedLines.filter((item) => item.isMedicineLine);

  const scheduleOnlyItems = classifiedLines.flatMap((item) => {
    if (!item.isScheduleOnly) {
      return [];
    }

    return item.schedules.map((schedule, scheduleIndex) => ({
      index: item.index,
      scheduleIndex,
      line: item.line,
      schedule,
    }));
  });

  if (medicineLines.length === 0 || scheduleOnlyItems.length === 0) {
    return lines;
  }

  const appendScheduleToMedicineLine = ({
    pairedLineMap,
    medicineIndex,
    medicineLine,
    schedule,
  }: {
    pairedLineMap: Map<number, string>;
    medicineIndex: number;
    medicineLine: string;
    schedule: PrescriptionSchedule;
  }) => {
    const currentLine = pairedLineMap.get(medicineIndex) || medicineLine;

    pairedLineMap.set(
      medicineIndex,
      normalizeWhitespace(`${currentLine} ${schedule.pattern}`)
    );
  };

  const buildResultFromPairs = ({
    pairedLineMap,
    skippedScheduleIndexes,
  }: {
    pairedLineMap: Map<number, string>;
    skippedScheduleIndexes: Set<number>;
  }) => {
    return classifiedLines
      .filter((item) => !skippedScheduleIndexes.has(item.index))
      .map((item) => pairedLineMap.get(item.index) || item.line);
  };

  const firstScheduleIndex = Math.min(
    ...scheduleOnlyItems.map((item) => item.index)
  );

  const lastScheduleIndex = Math.max(
    ...scheduleOnlyItems.map((item) => item.index)
  );

  const medicineLinesBeforeSchedules = medicineLines.filter((item) => {
    return item.index < firstScheduleIndex;
  });

  const medicineLinesAfterSchedules = medicineLines.filter((item) => {
    return item.index > lastScheduleIndex;
  });

  if (medicineLinesBeforeSchedules.length >= scheduleOnlyItems.length) {
    const pairedMedicineLines = medicineLinesBeforeSchedules.slice(
      medicineLinesBeforeSchedules.length - scheduleOnlyItems.length
    );

    const pairedLineMap = new Map<number, string>();
    const skippedScheduleIndexes = new Set<number>();

    pairedMedicineLines.forEach((medicineLine, pairIndex) => {
      const scheduleItem = scheduleOnlyItems[pairIndex];

      if (!scheduleItem?.schedule) {
        return;
      }

      appendScheduleToMedicineLine({
        pairedLineMap,
        medicineIndex: medicineLine.index,
        medicineLine: medicineLine.line,
        schedule: scheduleItem.schedule,
      });

      skippedScheduleIndexes.add(scheduleItem.index);
    });

    return buildResultFromPairs({
      pairedLineMap,
      skippedScheduleIndexes,
    });
  }

  if (medicineLinesAfterSchedules.length >= scheduleOnlyItems.length) {
    const pairedMedicineLines = medicineLinesAfterSchedules.slice(
      0,
      scheduleOnlyItems.length
    );

    const pairedLineMap = new Map<number, string>();
    const skippedScheduleIndexes = new Set<number>();

    pairedMedicineLines.forEach((medicineLine, pairIndex) => {
      const scheduleItem = scheduleOnlyItems[pairIndex];

      if (!scheduleItem?.schedule) {
        return;
      }

      appendScheduleToMedicineLine({
        pairedLineMap,
        medicineIndex: medicineLine.index,
        medicineLine: medicineLine.line,
        schedule: scheduleItem.schedule,
      });

      skippedScheduleIndexes.add(scheduleItem.index);
    });

    return buildResultFromPairs({
      pairedLineMap,
      skippedScheduleIndexes,
    });
  }

  const pairedLineMap = new Map<number, string>();
  const skippedScheduleIndexes = new Set<number>();
  const pairedMedicineIndexes = new Set<number>();

  for (const scheduleItem of scheduleOnlyItems) {
    const previousMedicine = [...medicineLines]
      .reverse()
      .find((medicineLine) => {
        return (
          medicineLine.index < scheduleItem.index &&
          !pairedMedicineIndexes.has(medicineLine.index)
        );
      });

    const nextMedicine = medicineLines.find((medicineLine) => {
      return (
        medicineLine.index > scheduleItem.index &&
        !pairedMedicineIndexes.has(medicineLine.index)
      );
    });

    const targetMedicine = previousMedicine || nextMedicine;

    if (!targetMedicine) {
      continue;
    }

    appendScheduleToMedicineLine({
      pairedLineMap,
      medicineIndex: targetMedicine.index,
      medicineLine: targetMedicine.line,
      schedule: scheduleItem.schedule,
    });

    pairedMedicineIndexes.add(targetMedicine.index);
    skippedScheduleIndexes.add(scheduleItem.index);
  }

  if (pairedLineMap.size > 0) {
    return buildResultFromPairs({
      pairedLineMap,
      skippedScheduleIndexes,
    });
  }

  return lines;
};

const getUsefulPrescriptionLines = (
  detectedText: string,
  medicines: MedicineReferenceRecord[]
) => {
  const cleanLines = getCleanPrescriptionLines(detectedText);

  if (cleanLines.length === 0) {
    return [];
  }

  const attachedLines = attachStandaloneSchedulesToMedicineLines(
    cleanLines,
    medicines
  );

  const usefulLines = attachedLines.filter((line) => {
    const lineWithoutSchedule = removeScheduleText(line);
    const bestMatch = findBestMedicineMatch(
      lineWithoutSchedule || line,
      medicines
    );

    const hasDose = Boolean(extractDirectDoseFromText(lineWithoutSchedule));
    const hasMedicineKeyword = MEDICINE_KEYWORD_REGEX.test(line);
    const hasSchedule = Boolean(extractPrescriptionSchedule(line));

    return (
      Boolean(bestMatch && bestMatch.score >= CANDIDATE_THRESHOLD) ||
      (hasDose && hasMedicineKeyword) ||
      hasSchedule
    );
  });

  if (usefulLines.length === 0) {
    return [detectedText];
  }

  return usefulLines;
};

const getActiveMedicineReferences = async (): Promise<
  MedicineReferenceRecord[]
> => {
  const medicines = await prisma.medicineReference.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      brandName: "asc",
    },
  });

  return medicines as unknown as MedicineReferenceRecord[];
};

export const medicineReferenceService = {
  async searchMedicineReferences(query: string) {
    const medicines = await getActiveMedicineReferences();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return medicines.slice(0, 20).map(formatMedicineReference);
    }

    return findMedicineMatches(trimmedQuery, medicines)
      .filter((match) => match.score >= CANDIDATE_THRESHOLD)
      .slice(0, 10)
      .map((match) => ({
        ...formatMedicineReference(match.medicine),
        matchConfidence: match.score,
        matchReason: match.reason,
      }));
  },

  async parseMedicineScan({
    detectedText,
    ocrConfidence = 80,
  }: {
    detectedText: string;
    ocrConfidence?: number;
  }) {
    const medicines = await getActiveMedicineReferences();
    const bestMatch = findBestMedicineMatch(detectedText, medicines);
    const schedule = extractPrescriptionSchedule(detectedText);

    if (!bestMatch || bestMatch.score < DISPLAY_MATCH_THRESHOLD) {
      return buildUnmatchedMedicineResult({
        text: detectedText,
        ocrConfidence,
        allMedicines: medicines,
        doseMode: "LABEL_SCAN",
      });
    }

    return buildMatchedMedicineResult({
      text: detectedText,
      ocrConfidence,
      match: bestMatch,
      schedule,
      allMedicines: medicines,
      doseMode: "LABEL_SCAN",
    });
  },

  async parsePrescriptionScan({
    detectedText,
    ocrConfidence = 80,
  }: {
    detectedText: string;
    ocrConfidence?: number;
  }) {
    const medicines = await getActiveMedicineReferences();
    const usefulLines = getUsefulPrescriptionLines(detectedText, medicines);

    const parsedMedicines = [];
    const seenMedicineKeys = new Set<string>();

    for (const line of usefulLines) {
      const lineWithoutSchedule = removeScheduleText(line);
      const bestMatch = findBestMedicineMatch(
        lineWithoutSchedule || line,
        medicines
      );

      if (!bestMatch || bestMatch.score < DISPLAY_MATCH_THRESHOLD) {
        continue;
      }

      const schedule = extractPrescriptionSchedule(line);

      const dose = extractDose({
        text: line,
        medicine: bestMatch.medicine,
        mode: "PRESCRIPTION_SCAN",
      });

      const duplicateKey = `${bestMatch.medicine.id}-${dose}-${
        schedule?.pattern || "NO_PATTERN"
      }`;

      if (seenMedicineKeys.has(duplicateKey)) {
        continue;
      }

      seenMedicineKeys.add(duplicateKey);

      parsedMedicines.push(
        buildMatchedMedicineResult({
          text: line,
          lineText: line,
          ocrConfidence,
          match: bestMatch,
          schedule,
          allMedicines: medicines,
          doseMode: "PRESCRIPTION_SCAN",
        })
      );
    }

    return {
      rawText: detectedText,
      ocrConfidence,
      medicines: parsedMedicines,
    };
  },
};
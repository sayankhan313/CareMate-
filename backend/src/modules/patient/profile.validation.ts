export type PatientGenderInput = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type UpdatePatientProfileInput = {
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: PatientGenderInput | null;
  healthRecordNumber?: string | null;
  medicalConditions?: string | null;
  allergies?: string | null;
  bloodGroup?: string | null;
  addressLine?: string | null;
  postcode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

const ALLOWED_GENDERS: PatientGenderInput[] = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

const getOptionalString = (value: unknown, fieldName: string, maximumLength: number) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${fieldName} must be text.`);

  const normalized = value.trim();

  if (!normalized) return null;
  if (normalized.length > maximumLength) throw new Error(`${fieldName} must not exceed ${maximumLength} characters.`);

  return normalized;
};

const getRequiredUpdateString = (value: unknown, fieldName: string, minimumLength: number, maximumLength: number) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${fieldName} must be text.`);

  const normalized = value.trim();

  if (normalized.length < minimumLength) throw new Error(`${fieldName} must contain at least ${minimumLength} characters.`);
  if (normalized.length > maximumLength) throw new Error(`${fieldName} must not exceed ${maximumLength} characters.`);

  return normalized;
};

const normalizeGender = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Gender is invalid.");

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_") as PatientGenderInput;

  if (!ALLOWED_GENDERS.includes(normalized)) throw new Error("Gender is invalid.");

  return normalized;
};

const validateDateOfBirth = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new Error("Date of birth is required.");

  const normalized = value.trim();
  let date: Date;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split("/").map(Number);
    date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year) throw new Error("Date of birth must be a valid date.");
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year) throw new Error("Date of birth must be a valid date.");
  } else {
    throw new Error("Date of birth must use DD/MM/YYYY or YYYY-MM-DD format.");
  }

  const today = new Date();
  const minimumDate = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (date > todayUtc) throw new Error("Date of birth cannot be in the future.");
  if (date < minimumDate) throw new Error("Date of birth is outside the supported range.");

  return normalized;
};

export const validateUpdatePatientProfile = (body: unknown): UpdatePatientProfileInput => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Profile update data is required.");

  const input = body as Record<string, unknown>;

  const result: UpdatePatientProfileInput = {
    fullName: getRequiredUpdateString(input.fullName, "Full name", 2, 100),
    phoneNumber: getRequiredUpdateString(input.phoneNumber, "Phone number", 7, 25),
    dateOfBirth: validateDateOfBirth(input.dateOfBirth),
    gender: normalizeGender(input.gender),
    healthRecordNumber: getOptionalString(input.healthRecordNumber, "NHS or health record number", 30),
    medicalConditions: getOptionalString(input.medicalConditions, "Medical conditions", 1000),
    allergies: getOptionalString(input.allergies, "Allergies", 1000),
    bloodGroup: getOptionalString(input.bloodGroup, "Blood group", 10),
    addressLine: getOptionalString(input.addressLine, "Address", 250),
    postcode: getOptionalString(input.postcode, "Postcode", 15),
    emergencyContactName: getOptionalString(input.emergencyContactName, "Emergency contact name", 100),
    emergencyContactPhone: getOptionalString(input.emergencyContactPhone, "Emergency contact phone", 25),
  };

  const hasUpdate = Object.values(result).some((value) => value !== undefined);

  if (!hasUpdate) throw new Error("Provide at least one profile field to update.");

  return result;
};
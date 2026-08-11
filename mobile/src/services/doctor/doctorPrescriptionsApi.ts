import { API_BASE_URL } from "../../constants/api";
import type { ParsedPrescriptionScan } from "../medicineScanApi";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorPrescriptionSource =
  | "MANUAL"
  | "SCANNED";

export type DoctorPrescriptionFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

export type DoctorPrescriptionItemInput = {
  name: string;
  dose: string;
  instructions?: string;
  frequency: DoctorPrescriptionFrequency;
  customFrequency?: string;
  selectedTimes: string[];
  startDate: string;
  endDate?: string;
  prescriptionPattern?: string;
};

export type CreateDoctorPrescriptionInput = {
  patientId: string;
  source: DoctorPrescriptionSource;
  notes?: string;
  rawDetectedText?: string;
  ocrConfidence?: number;
  items: DoctorPrescriptionItemInput[];
  imageUri?: string;
};

export type DoctorPrescriptionItem = {
  id: string;
  prescriptionId: string;
  medicineId: string | null;
  name: string;
  dose: string;
  instructions: string | null;
  frequency: DoctorPrescriptionFrequency;
  customFrequency: string | null;
  selectedTimes: string[];
  startDate: string;
  endDate: string | null;
  prescriptionPattern: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DoctorPrescription = {
  id: string;
  patientId: string;
  prescribedByDoctorId: string;
  source: DoctorPrescriptionSource;
  imageUrl: string | null;
  rawDetectedText: string | null;
  ocrConfidence: number | null;
  notes: string | null;
  prescribedAt: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
  prescribedByDoctor: {
    id: string;
    fullName: string;
    email: string;
    specialization: string | null;
  };
  items: DoctorPrescriptionItem[];
};

export type CreateDoctorPrescriptionData = {
  prescription: DoctorPrescription;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return (
      result.message[0]?.message ||
      "Request failed."
    );
  }

  if (Array.isArray(result?.errors)) {
    return (
      result.errors[0]?.message ||
      "Request failed."
    );
  }

  if (Array.isArray(result?.issues)) {
    return (
      result.issues[0]?.message ||
      "Request failed."
    );
  }

  return "Request failed.";
};

const getToken = async () => {
  const token =
    await tokenStorage.getToken();

  if (!token) {
    throw new Error(
      "Please login again."
    );
  }

  return token;
};

const readResponse = async <T>(
  response: Response
) => {
  let result:
    | ApiResponse<T>
    | any = {};

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      getErrorMessage(result)
    );
  }

  return result.data as T;
};

const getImageFileName = (
  imageUri: string
) => {
  const cleanUri =
    imageUri.split("?")[0];

  const fileName =
    cleanUri.split("/").pop();

  return (
    fileName ||
    `prescription-${Date.now()}.jpg`
  );
};

const getImageMimeType = (
  imageUri: string
) => {
  const value =
    imageUri.toLowerCase();

  if (value.endsWith(".png")) {
    return "image/png";
  }

  if (value.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
};

export const doctorPrescriptionsApi =
  {
    async parsePrescriptionScan({
      detectedText,
      ocrConfidence = 82,
    }: {
      detectedText: string;
      ocrConfidence?: number;
    }) {
      const token =
        await getToken();

      const response = await fetch(
        `${API_BASE_URL}/doctor/prescription-scan/parse`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            detectedText,
            ocrConfidence,
          }),
        }
      );

      return readResponse<ParsedPrescriptionScan>(
        response
      );
    },

    async createPrescription(
      input: CreateDoctorPrescriptionInput
    ) {
      const token =
        await getToken();

      if (input.imageUri) {
        const formData =
          new FormData();

        formData.append(
          "source",
          input.source
        );

        formData.append(
          "items",
          JSON.stringify(
            input.items
          )
        );

        if (input.notes?.trim()) {
          formData.append(
            "notes",
            input.notes.trim()
          );
        }

        if (
          input.rawDetectedText?.trim()
        ) {
          formData.append(
            "rawDetectedText",
            input.rawDetectedText.trim()
          );
        }

        if (
          input.ocrConfidence !==
          undefined
        ) {
          formData.append(
            "ocrConfidence",
            String(
              input.ocrConfidence
            )
          );
        }

        formData.append(
          "prescriptionImage",
          {
            uri: input.imageUri,
            name: getImageFileName(
              input.imageUri
            ),
            type: getImageMimeType(
              input.imageUri
            ),
          } as any
        );

        const response =
          await fetch(
            `${API_BASE_URL}/doctor/patients/${encodeURIComponent(
              input.patientId
            )}/prescriptions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

        return readResponse<CreateDoctorPrescriptionData>(
          response
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/doctor/patients/${encodeURIComponent(
          input.patientId
        )}/prescriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            source: input.source,
            notes:
              input.notes?.trim() ||
              undefined,
            rawDetectedText:
              input.rawDetectedText?.trim() ||
              undefined,
            ocrConfidence:
              input.ocrConfidence,
            items: input.items,
          }),
        }
      );

      return readResponse<CreateDoctorPrescriptionData>(
        response
      );
    },
  };
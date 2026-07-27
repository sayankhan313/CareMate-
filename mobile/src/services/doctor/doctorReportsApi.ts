import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorReportQueueStatus = "ALL" | "PENDING" | "REVIEWED";

export type DoctorReportCategory =
  | "BLOOD_TEST"
  | "SCAN_XRAY"
  | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY"
  | "MEDICAL_LETTER"
  | "OTHER_MEDICAL_REPORT";

export type DoctorPatientReportStatus =
  | "PENDING_REVIEW"
  | "PARTIALLY_REVIEWED"
  | "REVIEWED";

export type DoctorReportReviewStatus = "PENDING" | "REVIEWED";

export type DoctorReportContentSafetyStatus =
  | "NOT_SCANNED"
  | "CLEAR"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type DoctorReportPatient = {
  id: string;
  fullName: string;
  email: string;
};

export type DoctorReportReview = {
  id: string;
  reportId: string;
  doctorId: string;
  status: DoctorReportReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  patientSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DoctorPatientReport = {
  id: string;
  patientId: string;
  title: string;
  category: DoctorReportCategory;
  description: string | null;
  reportDate: string | null;
  status: DoctorPatientReportStatus;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  contentSafetyStatus: DoctorReportContentSafetyStatus;
  contentSafetyMessage: string | null;
  contentSafetyCheckedAt: string | null;
  isSampleDataConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
  patient: DoctorReportPatient;
  review: DoctorReportReview | null;
};

export type DoctorPatientReportsData = {
  reports: DoctorPatientReport[];
  summary: {
    total: number;
    pending: number;
    reviewed: number;
    blocked: number;
  };
};

export type DoctorReportFileSource = {
  uri: string;
  headers: {
    Authorization: string;
  };
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Request failed.";
  }

  if (Array.isArray(result?.errors)) {
    return result.errors[0]?.message || "Request failed.";
  }

  if (Array.isArray(result?.issues)) {
    return result.issues[0]?.message || "Request failed.";
  }

  return "Request failed.";
};

const requireStringId = (value: unknown, fieldName: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is missing. Please reopen the report.`);
  }

  return value.trim();
};

const getToken = async () => {
  const token = await tokenStorage.getToken();

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Please login again.");
  }

  return token.trim();
};

const getAuthHeaders = async () => {
  const token = await getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T> | any;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result?.success) {
    throw new Error(getErrorMessage(result));
  }

  if (result.data === undefined || result.data === null) {
    throw new Error("The server returned empty report data.");
  }

  return result.data as T;
};

const getPatientReportsUrl = (patientIdValue: unknown) => {
  const patientId = requireStringId(patientIdValue, "Patient ID");

  return `${API_BASE_URL}/doctor/patients/${encodeURIComponent(patientId)}/reports`;
};

const getReportUrl = (patientIdValue: unknown, reportIdValue: unknown) => {
  const patientId = requireStringId(patientIdValue, "Patient ID");
  const reportId = requireStringId(reportIdValue, "Report ID");

  return `${API_BASE_URL}/doctor/patients/${encodeURIComponent(
    patientId
  )}/reports/${encodeURIComponent(reportId)}`;
};

const readBlobAsDataUri = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("The downloaded report image could not be read."));
    };

    reader.onloadend = () => {
      if (typeof reader.result !== "string" || !reader.result.startsWith("data:")) {
        reject(new Error("The downloaded report image returned invalid data."));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(blob);
  });
};

const normalizeImageDataUri = (rawDataUri: string, mimeType: string) => {
  const commaIndex = rawDataUri.indexOf(",");

  if (commaIndex < 0) {
    throw new Error("The downloaded report image did not contain valid Base64 data.");
  }

  const base64Payload = rawDataUri.slice(commaIndex + 1).trim();

  if (!base64Payload) {
    throw new Error("The downloaded report image was empty.");
  }

  const normalizedMimeType = mimeType.split(";")[0].trim().toLowerCase();

  if (!normalizedMimeType.startsWith("image/")) {
    throw new Error(
      `The server returned ${normalizedMimeType || "an unknown type"} instead of an image.`
    );
  }

  return `data:${normalizedMimeType};base64,${base64Payload}`;
};

const readFileError = async (response: Response) => {
  try {
    const text = await response.text();

    if (!text) {
      return `Unable to load report file. Server returned ${response.status}.`;
    }

    try {
      return getErrorMessage(JSON.parse(text));
    } catch {
      return text.length <= 200
        ? text
        : `Unable to load report file. Server returned ${response.status}.`;
    }
  } catch {
    return `Unable to load report file. Server returned ${response.status}.`;
  }
};

export const doctorReportsApi = {
  async listReportQueue(
    status: DoctorReportQueueStatus = "PENDING"
  ): Promise<DoctorPatientReportsData> {
    const response = await fetch(
      `${API_BASE_URL}/doctor/reports?status=${encodeURIComponent(status)}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<DoctorPatientReportsData>(response);
  },

  async listPatientReports(
    patientIdValue: unknown
  ): Promise<DoctorPatientReportsData> {
    const response = await fetch(getPatientReportsUrl(patientIdValue), {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<DoctorPatientReportsData>(response);
  },

  async getReportDetail(
    patientIdValue: unknown,
    reportIdValue: unknown
  ): Promise<DoctorPatientReport> {
    const response = await fetch(
      getReportUrl(patientIdValue, reportIdValue),
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<DoctorPatientReport>(response);
  },

  async reviewReport(
    patientIdValue: unknown,
    reportIdValue: unknown,
    payload: { reviewNote?: string }
  ): Promise<DoctorPatientReport> {
    const reviewNote =
      typeof payload?.reviewNote === "string" ? payload.reviewNote.trim() : "";

    if (reviewNote.length < 2) {
      throw new Error("Review note must contain at least 2 characters.");
    }

    const response = await fetch(
      `${getReportUrl(patientIdValue, reportIdValue)}/review`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ reviewNote }),
      }
    );

    return readResponse<DoctorPatientReport>(response);
  },

  async getReportFileSource(
    patientIdValue: unknown,
    reportIdValue: unknown
  ): Promise<DoctorReportFileSource> {
    const token = await getToken();

    return {
      uri: `${getReportUrl(patientIdValue, reportIdValue)}/file`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  },

  async getReportImageDataUri(
    patientIdValue: unknown,
    reportIdValue: unknown
  ): Promise<string> {
    const token = await getToken();
    const url = `${getReportUrl(patientIdValue, reportIdValue)}/file`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "image/jpeg,image/png,image/webp,image/*",
      },
    });

    if (!response.ok) {
      throw new Error(await readFileError(response));
    }

    const responseContentType =
      response.headers.get("content-type")?.toLowerCase().trim() || "";

    if (!responseContentType.startsWith("image/")) {
      throw new Error(
        responseContentType
          ? `The server returned ${responseContentType} instead of an image.`
          : "The server did not return an image content type."
      );
    }

    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error("The downloaded report image was empty.");
    }

    const rawDataUri = await readBlobAsDataUri(blob);

    return normalizeImageDataUri(rawDataUri, responseContentType);
  },
};
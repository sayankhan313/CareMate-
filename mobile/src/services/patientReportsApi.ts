import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PatientReportCategory =
  | "BLOOD_TEST"
  | "SCAN_XRAY"
  | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY"
  | "MEDICAL_LETTER"
  | "OTHER_MEDICAL_REPORT";

export type PatientReportStatus =
  | "PENDING_REVIEW"
  | "PARTIALLY_REVIEWED"
  | "REVIEWED";

export type PatientReportReviewStatus =
  | "PENDING"
  | "REVIEWED";

export type PatientReportSafetyStatus =
  | "NOT_SCANNED"
  | "CLEAR"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type PatientReportDoctor = {
  id: string;
  fullName: string;
  specialization: string | null;
};

export type PatientReportReview = {
  id: string;
  doctorId: string;
  status: PatientReportReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  patientSeenAt: string | null;
  doctor: PatientReportDoctor;
};

export type PatientReport = {
  id: string;
  title: string;
  category: PatientReportCategory;
  description: string | null;
  reportDate: string | null;
  status: PatientReportStatus;

  originalFileName: string;
  mimeType: string;
  fileSize: number;

  contentSafetyStatus: PatientReportSafetyStatus;
  contentSafetyMessage: string | null;
  contentSafetyCheckedAt: string | null;

  createdAt: string;
  updatedAt: string;

  isUnread: boolean;

  reviewSummary: {
    total: number;
    pending: number;
    reviewed: number;
    unread: number;
  };

  reviews: PatientReportReview[];
};

export type PatientReportsData = {
  reports: PatientReport[];

  summary: {
    total: number;
    pending: number;
    partiallyReviewed: number;
    reviewed: number;
    unreadReviews: number;
  };
};

export type PatientReportUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export type UploadPatientReportPayload = {
  title: string;
  category: PatientReportCategory;
  description?: string;
  reportDate?: string;
  confirmSampleData: boolean;
  file: PatientReportUploadFile;
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

const getJsonHeaders = async () => {
  const token = await getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const readResponse = async <T>(
  response: Response
): Promise<T> => {
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

export const patientReportsApi = {
  async listReports() {
    const response = await fetch(
      `${API_BASE_URL}/patient/reports`,
      {
        method: "GET",
        headers:
          await getJsonHeaders(),
      }
    );

    return readResponse<PatientReportsData>(
      response
    );
  },

  async getReportDetail(
    reportId: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/patient/reports/${encodeURIComponent(
        reportId
      )}`,
      {
        method: "GET",
        headers:
          await getJsonHeaders(),
      }
    );

    return readResponse<PatientReport>(
      response
    );
  },

  async markReportSeen(
    reportId: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/patient/reports/${encodeURIComponent(
        reportId
      )}/seen`,
      {
        method: "POST",
        headers:
          await getJsonHeaders(),
      }
    );

    return readResponse<PatientReport>(
      response
    );
  },

  async uploadReport(
    payload: UploadPatientReportPayload
  ) {
    const token = await getToken();

    const formData =
      new FormData();

    formData.append(
      "reportFile",
      {
        uri: payload.file.uri,
        name: payload.file.name,
        type: payload.file.type,
      } as any
    );

    formData.append(
      "title",
      payload.title.trim()
    );

    formData.append(
      "category",
      payload.category
    );

    if (
      payload.description?.trim()
    ) {
      formData.append(
        "description",
        payload.description.trim()
      );
    }

    if (
      payload.reportDate?.trim()
    ) {
      formData.append(
        "reportDate",
        payload.reportDate.trim()
      );
    }

    formData.append(
      "confirmSampleData",
      String(
        payload.confirmSampleData
      )
    );

    const response = await fetch(
      `${API_BASE_URL}/patient/reports`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        body: formData,
      }
    );

    return readResponse<PatientReport>(
      response
    );
  },
};
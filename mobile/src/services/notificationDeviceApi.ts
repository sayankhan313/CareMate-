import { API_BASE_URL } from "../constants/api";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type NotificationDevicePlatform = "ANDROID" | "IOS";

export type NotificationDevice = {
  id: string;
  platform: NotificationDevicePlatform;
  deviceId?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RegisterNotificationDeviceInput = {
  token: string;
  platform: NotificationDevicePlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Notification request failed.";
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || "Notification request failed.";
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || "Notification request failed.";
  return "Notification request failed.";
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T> | any;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid notification response.");
  }

  if (!response.ok || !result?.success) throw new Error(getErrorMessage(result));
  if (result.data === undefined || result.data === null) throw new Error("The server returned empty notification data.");

  return result.data as T;
};

const getHeaders = (authToken: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${authToken}` });

export const notificationDeviceApi = {
  async registerDevice(authToken: string, input: RegisterNotificationDeviceInput): Promise<{ device: NotificationDevice }> {
    const response = await fetch(`${API_BASE_URL}/notifications/devices`, {
      method: "POST",
      headers: getHeaders(authToken),
      body: JSON.stringify(input),
    });

    return readResponse<{ device: NotificationDevice }>(response);
  },

  async deactivateDevice(authToken: string, token: string): Promise<{ deactivated: boolean }> {
    const response = await fetch(`${API_BASE_URL}/notifications/devices`, {
      method: "DELETE",
      headers: getHeaders(authToken),
      body: JSON.stringify({ token }),
    });

    return readResponse<{ deactivated: boolean }>(response);
  },
};

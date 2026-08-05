import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type NotificationPriority = "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationPushStatus = "PENDING" | "SENT" | "PARTIAL" | "FAILED" | "SKIPPED";

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  targetScreen?: string | null;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  pushStatus: NotificationPushStatus;
  sentAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListData = {
  notifications: UserNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type ApiResponse<T> = { success: boolean; message: string; data: T };

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Notification request failed.";
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || "Notification request failed.";
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || "Notification request failed.";
  return "Notification request failed.";
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Your session has expired. Please log in again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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

export const notificationApi = {
  async listNotifications(page = 1, limit = 20, unreadOnly = false) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), unreadOnly: String(unreadOnly) });
    const response = await fetch(`${API_BASE_URL}/notifications?${query.toString()}`, { method: "GET", headers: await getAuthHeaders() });
    return readResponse<NotificationListData>(response);
  },

  async getUnreadCount() {
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, { method: "GET", headers: await getAuthHeaders() });
    return readResponse<{ unreadCount: number }>(response);
  },

  async markNotificationRead(notificationId: string) {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: "PATCH", headers: await getAuthHeaders() });
    return readResponse<{ notification: UserNotification }>(response);
  },

  async markAllNotificationsRead() {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, { method: "PATCH", headers: await getAuthHeaders() });
    return readResponse<{ updatedCount: number }>(response);
  },
};

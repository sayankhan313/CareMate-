import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type NotificationPriority = "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationPushStatus = "PENDING" | "SENT" | "PARTIAL" | "FAILED" | "SKIPPED";

export type NotificationData = Record<string, unknown> & {
  source?: string | null;
  recipientRole?: string | null;
  senderRole?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  caregiverId?: string | null;
  caregiverName?: string | null;
  initiatorType?: string | null;
};

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  targetScreen?: string | null;
  data?: NotificationData | null;
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

export type CaregiverNotificationSender = {
  role: "CAREGIVER";
  id?: string;
  name?: string;
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

const getText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;

export const getCaregiverNotificationSender = (notification: Pick<UserNotification, "targetScreen" | "data">): CaregiverNotificationSender | null => {
  const data = notification.data;
  if (!data) return null;

  const recipientRole = getText(data.recipientRole);
  if (recipientRole && recipientRole !== "PATIENT") return null;

  const senderRole = getText(data.senderRole);
  const initiatorType = getText(data.initiatorType);
  const source = getText(data.source) || "";
  const targetScreen = getText(notification.targetScreen) || "";

  const caregiverTriggered = senderRole === "CAREGIVER" || initiatorType === "CAREGIVER" || source.startsWith("CAREGIVER_");
  const patientFacing = recipientRole === "PATIENT" || targetScreen.startsWith("Patient") || targetScreen === "Consultations";

  if (!caregiverTriggered || !patientFacing) return null;

  return {
    role: "CAREGIVER",
    id: getText(data.senderId) || getText(data.caregiverId),
    name: getText(data.senderName) || getText(data.caregiverName),
  };
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

  async markPharmacyOrderNotificationRead(orderId: string) {
    const result = await this.listNotifications(1, 100, true);

    const matchingNotifications = result.notifications.filter(notification =>
      notification.type === "NEW_MEDICINE_ORDER" &&
      notification.entityType === "MEDICINE_ORDER" &&
      notification.entityId === orderId &&
      !notification.isRead,
    );

    if (matchingNotifications.length === 0) return { updatedCount: 0 };

    const results = await Promise.allSettled(
      matchingNotifications.map(notification => this.markNotificationRead(notification.id)),
    );

    return {
      updatedCount: results.filter(result => result.status === "fulfilled").length,
    };
  },
};
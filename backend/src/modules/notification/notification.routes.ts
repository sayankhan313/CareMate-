import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { notificationController } from "./notification.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/preferences", notificationController.getPatientPreferences);
router.patch("/preferences", notificationController.updatePatientNotificationPreferences);
router.patch("/reminder-preferences", notificationController.updatePatientReminderPreferences);
router.post("/devices", notificationController.registerDeviceToken);
router.delete("/devices", notificationController.deactivateDeviceToken);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllNotificationsRead);
router.post("/test", notificationController.sendTestNotification);
router.get("/", notificationController.listNotifications);
router.patch("/:notificationId/read", notificationController.markNotificationRead);

export default router;
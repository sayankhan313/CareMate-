-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationPushStatus" AS ENUM ('PENDING', 'SENT', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM_TEST', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'DOCTOR_VERIFICATION_REQUESTED', 'PHARMACY_VERIFICATION_REQUESTED', 'SAFETY_ALERT_CREATED', 'SAFETY_ALERT_ESCALATED', 'SAFETY_ALERT_RESOLVED', 'CRITICAL_VITAL_DETECTED', 'EMERGENCY_CONSULTATION_REQUESTED', 'MANUAL_CONSULTATION_REQUESTED', 'CONSULTATION_ACCEPTED', 'CONSULTATION_REJECTED', 'CONSULTATION_COMPLETED', 'CONSULTATION_CANCELLED', 'PATIENT_JOINED_CALL', 'MEDICINE_REVIEW_REQUESTED', 'MEDICINE_REVIEW_APPROVED', 'MEDICINE_REVIEW_REJECTED', 'NEW_PRESCRIPTION', 'PATIENT_REPORT_UPLOADED', 'REPORT_REVIEWED', 'PATIENT_ASSIGNED', 'PATIENT_UNASSIGNED', 'PRIMARY_DOCTOR_CHANGED', 'MEDICINE_REMINDER_DUE', 'MEDICINE_REMINDER_SNOOZED', 'MISSED_DOSE_ALERT', 'REPEATED_MISSED_DOSE', 'NEW_MEDICINE_ORDER', 'ORDER_RECEIVED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_DELIVERED', 'ORDER_CANCELLED');

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "appVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "entityType" TEXT,
    "entityId" TEXT,
    "targetScreen" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "pushStatus" "NotificationPushStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "deviceTokenId" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "firebaseMessageId" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_isActive_idx" ON "DeviceToken"("userId", "isActive");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_platform_idx" ON "DeviceToken"("userId", "platform");

-- CreateIndex
CREATE INDEX "DeviceToken_lastSeenAt_idx" ON "DeviceToken"("lastSeenAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_isRead_createdAt_idx" ON "UserNotification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_type_createdAt_idx" ON "UserNotification"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_entityType_entityId_idx" ON "UserNotification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "UserNotification_pushStatus_createdAt_idx" ON "UserNotification"("pushStatus", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_deviceTokenId_createdAt_idx" ON "NotificationDelivery"("deviceTokenId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_deviceTokenId_key" ON "NotificationDelivery"("notificationId", "deviceTokenId");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "UserNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_deviceTokenId_fkey" FOREIGN KEY ("deviceTokenId") REFERENCES "DeviceToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

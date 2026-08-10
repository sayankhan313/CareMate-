-- CreateEnum
CREATE TYPE "AppLanguage" AS ENUM ('ENGLISH', 'HINDI', 'GREEK', 'HAUSA', 'GERMAN');

-- CreateEnum
CREATE TYPE "AppTextSize" AS ENUM ('SMALL', 'NORMAL', 'LARGE', 'EXTRA_LARGE');

-- CreateTable
CREATE TABLE "PatientSafetyPreference" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "countdownSeconds" INTEGER NOT NULL DEFAULT 30,
    "notifyAssignedDoctors" BOOLEAN NOT NULL DEFAULT true,
    "shareLatestVitalsOnEscalation" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSafetyPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAccessibilityPreference" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "language" "AppLanguage" NOT NULL DEFAULT 'ENGLISH',
    "textSize" "AppTextSize" NOT NULL DEFAULT 'NORMAL',
    "highContrastEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "screenReaderHintsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hapticFeedbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAccessibilityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPrivacyPreference" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "shareVitalsWithAssignedDoctors" BOOLEAN NOT NULL DEFAULT true,
    "shareMedicinesWithAssignedDoctors" BOOLEAN NOT NULL DEFAULT true,
    "shareReportsWithAssignedDoctors" BOOLEAN NOT NULL DEFAULT true,
    "hideSensitiveNotificationContent" BOOLEAN NOT NULL DEFAULT true,
    "loginAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "confirmBeforeReportSharing" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPrivacyPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientSafetyPreference_patientId_key" ON "PatientSafetyPreference"("patientId");

-- CreateIndex
CREATE INDEX "PatientSafetyPreference_patientId_idx" ON "PatientSafetyPreference"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccessibilityPreference_patientId_key" ON "PatientAccessibilityPreference"("patientId");

-- CreateIndex
CREATE INDEX "PatientAccessibilityPreference_patientId_idx" ON "PatientAccessibilityPreference"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPrivacyPreference_patientId_key" ON "PatientPrivacyPreference"("patientId");

-- CreateIndex
CREATE INDEX "PatientPrivacyPreference_patientId_idx" ON "PatientPrivacyPreference"("patientId");

-- AddForeignKey
ALTER TABLE "PatientSafetyPreference" ADD CONSTRAINT "PatientSafetyPreference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessibilityPreference" ADD CONSTRAINT "PatientAccessibilityPreference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrivacyPreference" ADD CONSTRAINT "PatientPrivacyPreference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

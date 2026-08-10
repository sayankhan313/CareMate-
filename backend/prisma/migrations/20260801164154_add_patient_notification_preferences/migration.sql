-- CreateTable
CREATE TABLE "PatientNotificationPreference" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicineReminders" BOOLEAN NOT NULL DEFAULT true,
    "missedDoseAlerts" BOOLEAN NOT NULL DEFAULT true,
    "consultationUpdates" BOOLEAN NOT NULL DEFAULT true,
    "medicineReviewUpdates" BOOLEAN NOT NULL DEFAULT true,
    "reportReviewUpdates" BOOLEAN NOT NULL DEFAULT true,
    "criticalVitalAlerts" BOOLEAN NOT NULL DEFAULT true,
    "safetyResponseAlerts" BOOLEAN NOT NULL DEFAULT true,
    "careTeamUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientNotificationPreference_patientId_key" ON "PatientNotificationPreference"("patientId");

-- CreateIndex
CREATE INDEX "PatientNotificationPreference_patientId_idx" ON "PatientNotificationPreference"("patientId");

-- AddForeignKey
ALTER TABLE "PatientNotificationPreference" ADD CONSTRAINT "PatientNotificationPreference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

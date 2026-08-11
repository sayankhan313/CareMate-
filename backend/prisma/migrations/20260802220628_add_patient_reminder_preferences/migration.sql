-- CreateTable
CREATE TABLE "PatientReminderPreference" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "defaultSnoozeMinutes" INTEGER NOT NULL DEFAULT 10,
    "missedDoseReminder" BOOLEAN NOT NULL DEFAULT true,
    "repeatMissedDoseAlert" BOOLEAN NOT NULL DEFAULT true,
    "repeatIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "vibrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientReminderPreference_patientId_key" ON "PatientReminderPreference"("patientId");

-- CreateIndex
CREATE INDEX "PatientReminderPreference_patientId_idx" ON "PatientReminderPreference"("patientId");

-- AddForeignKey
ALTER TABLE "PatientReminderPreference" ADD CONSTRAINT "PatientReminderPreference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SafetyAlertDoctorEscalationSource" AS ENUM ('INITIAL_SAFETY_RESPONSE', 'CAREGIVER_RETRY');

-- CreateTable
CREATE TABLE "SafetyAlertDoctorEscalation" (
    "id" TEXT NOT NULL,
    "safetyAlertId" TEXT NOT NULL,
    "doctorId" TEXT,
    "triggeredByUserId" TEXT,
    "source" "SafetyAlertDoctorEscalationSource" NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyAlertDoctorEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SafetyAlertDoctorEscalation_safetyAlertId_idx" ON "SafetyAlertDoctorEscalation"("safetyAlertId");

-- CreateIndex
CREATE INDEX "SafetyAlertDoctorEscalation_doctorId_idx" ON "SafetyAlertDoctorEscalation"("doctorId");

-- CreateIndex
CREATE INDEX "SafetyAlertDoctorEscalation_triggeredByUserId_idx" ON "SafetyAlertDoctorEscalation"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "SafetyAlertDoctorEscalation_createdAt_idx" ON "SafetyAlertDoctorEscalation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyAlertDoctorEscalation_safetyAlertId_doctorId_key" ON "SafetyAlertDoctorEscalation"("safetyAlertId", "doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyAlertDoctorEscalation_safetyAlertId_sequenceNumber_key" ON "SafetyAlertDoctorEscalation"("safetyAlertId", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "SafetyAlertDoctorEscalation" ADD CONSTRAINT "SafetyAlertDoctorEscalation_safetyAlertId_fkey" FOREIGN KEY ("safetyAlertId") REFERENCES "SafetyAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlertDoctorEscalation" ADD CONSTRAINT "SafetyAlertDoctorEscalation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlertDoctorEscalation" ADD CONSTRAINT "SafetyAlertDoctorEscalation_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

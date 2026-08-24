-- CreateEnum
CREATE TYPE "CaregiverObservationCategory" AS ENUM ('GENERAL', 'ROUTINE', 'APPETITE', 'SLEEP', 'MOBILITY', 'MOOD', 'MEDICATION_SUPPORT');

-- CreateTable
CREATE TABLE "CaregiverObservation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "category" "CaregiverObservationCategory" NOT NULL DEFAULT 'GENERAL',
    "observation" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaregiverObservation_patientId_idx" ON "CaregiverObservation"("patientId");

-- CreateIndex
CREATE INDEX "CaregiverObservation_caregiverId_idx" ON "CaregiverObservation"("caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverObservation_patientId_caregiverId_idx" ON "CaregiverObservation"("patientId", "caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverObservation_observedAt_idx" ON "CaregiverObservation"("observedAt");

-- CreateIndex
CREATE INDEX "CaregiverObservation_createdAt_idx" ON "CaregiverObservation"("createdAt");

-- AddForeignKey
ALTER TABLE "CaregiverObservation" ADD CONSTRAINT "CaregiverObservation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverObservation" ADD CONSTRAINT "CaregiverObservation_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SafetyAlertStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('EMERGENCY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SafetyAlert" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "vitalReadingId" TEXT,
    "status" "SafetyAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "timerEndsAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "safetyAlertId" TEXT,
    "type" "ConsultationType" NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "preferredAt" TIMESTAMP(3),
    "notes" TEXT,
    "doctorName" TEXT,
    "rejectionNote" TEXT,
    "jaasRoomName" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SafetyAlert_patientId_idx" ON "SafetyAlert"("patientId");

-- CreateIndex
CREATE INDEX "SafetyAlert_doctorId_idx" ON "SafetyAlert"("doctorId");

-- CreateIndex
CREATE INDEX "SafetyAlert_vitalReadingId_idx" ON "SafetyAlert"("vitalReadingId");

-- CreateIndex
CREATE INDEX "SafetyAlert_status_idx" ON "SafetyAlert"("status");

-- CreateIndex
CREATE INDEX "SafetyAlert_createdAt_idx" ON "SafetyAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_safetyAlertId_key" ON "Consultation"("safetyAlertId");

-- CreateIndex
CREATE INDEX "Consultation_patientId_idx" ON "Consultation"("patientId");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_idx" ON "Consultation"("doctorId");

-- CreateIndex
CREATE INDEX "Consultation_status_idx" ON "Consultation"("status");

-- CreateIndex
CREATE INDEX "Consultation_type_idx" ON "Consultation"("type");

-- CreateIndex
CREATE INDEX "Consultation_createdAt_idx" ON "Consultation"("createdAt");

-- AddForeignKey
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_vitalReadingId_fkey" FOREIGN KEY ("vitalReadingId") REFERENCES "PatientVitalReading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_safetyAlertId_fkey" FOREIGN KEY ("safetyAlertId") REFERENCES "SafetyAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

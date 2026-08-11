-- CreateEnum
CREATE TYPE "PrescriptionSource" AS ENUM ('MANUAL', 'SCANNED');

-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "prescribedByDoctorId" TEXT;

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescribedByDoctorId" TEXT NOT NULL,
    "source" "PrescriptionSource" NOT NULL DEFAULT 'MANUAL',
    "imageUrl" TEXT,
    "rawDetectedText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "notes" TEXT,
    "prescribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "instructions" TEXT,
    "frequency" "MedicineFrequency" NOT NULL,
    "customFrequency" TEXT,
    "selectedTimes" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "prescriptionPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_prescribedByDoctorId_idx" ON "Prescription"("prescribedByDoctorId");

-- CreateIndex
CREATE INDEX "Prescription_source_idx" ON "Prescription"("source");

-- CreateIndex
CREATE INDEX "Prescription_prescribedAt_idx" ON "Prescription"("prescribedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionItem_medicineId_key" ON "PrescriptionItem"("medicineId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_medicineId_idx" ON "PrescriptionItem"("medicineId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_startDate_idx" ON "PrescriptionItem"("startDate");

-- CreateIndex
CREATE INDEX "Medicine_prescribedByDoctorId_idx" ON "Medicine"("prescribedByDoctorId");

-- CreateIndex
CREATE INDEX "Medicine_source_idx" ON "Medicine"("source");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_prescribedByDoctorId_fkey" FOREIGN KEY ("prescribedByDoctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_prescribedByDoctorId_fkey" FOREIGN KEY ("prescribedByDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

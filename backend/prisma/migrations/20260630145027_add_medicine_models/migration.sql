-- CreateEnum
CREATE TYPE "MedicineSource" AS ENUM ('MANUAL', 'SCANNER', 'DOCTOR_PRESCRIBED');

-- CreateEnum
CREATE TYPE "MedicineFrequency" AS ENUM ('ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'AS_NEEDED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MedicineReviewStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DoseLogStatus" AS ENUM ('PENDING', 'TAKEN', 'MISSED', 'SNOOZED');

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "instructions" TEXT,
    "source" "MedicineSource" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineReminder" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "frequency" "MedicineFrequency" NOT NULL DEFAULT 'ONCE_DAILY',
    "customFrequency" TEXT,
    "timeOfDay" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sendToDoctorForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "MedicineReviewStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineDoseLog" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "DoseLogStatus" NOT NULL DEFAULT 'PENDING',
    "takenAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineDoseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medicine_patientId_idx" ON "Medicine"("patientId");

-- CreateIndex
CREATE INDEX "MedicineReminder_medicineId_idx" ON "MedicineReminder"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineDoseLog_patientId_idx" ON "MedicineDoseLog"("patientId");

-- CreateIndex
CREATE INDEX "MedicineDoseLog_scheduledFor_idx" ON "MedicineDoseLog"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineDoseLog_reminderId_scheduledFor_key" ON "MedicineDoseLog"("reminderId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDoseLog" ADD CONSTRAINT "MedicineDoseLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "MedicineReminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDoseLog" ADD CONSTRAINT "MedicineDoseLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

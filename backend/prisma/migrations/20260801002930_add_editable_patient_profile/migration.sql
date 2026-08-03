/*
  Warnings:

  - A unique constraint covering the columns `[healthRecordNumber]` on the table `PatientProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "healthRecordNumber" TEXT,
ADD COLUMN     "postcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_healthRecordNumber_key" ON "PatientProfile"("healthRecordNumber");

-- CreateIndex
CREATE INDEX "PatientProfile_healthRecordNumber_idx" ON "PatientProfile"("healthRecordNumber");

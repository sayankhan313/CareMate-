/*
  Warnings:

  - You are about to drop the column `createdAt` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `ocrConfidence` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `rawDetectedText` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `requestType` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reviewNote` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PatientPrescriptionSubmission` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PatientRefillVerificationPath" AS ENUM ('CAREMATE_PRESCRIPTION', 'ASSIGNED_DOCTOR', 'EXTERNAL_EVIDENCE');

-- CreateEnum
CREATE TYPE "PatientRefillDoctorVerificationStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PatientMedicineEvidenceType" AS ENUM ('NHS_APP_SCREENSHOT', 'EPS_TOKEN', 'GP_REPEAT_MEDICATION_RECORD', 'HOSPITAL_OR_CLINIC_LETTER', 'PHARMACY_LABELLED_MEDICINE', 'OTHER');

-- DropIndex
DROP INDEX "PatientPrescriptionSubmission_createdAt_idx";

-- DropIndex
DROP INDEX "PatientPrescriptionSubmission_patientId_status_idx";

-- DropIndex
DROP INDEX "PatientPrescriptionSubmission_pharmacyId_status_idx";

-- DropIndex
DROP INDEX "PatientPrescriptionSubmission_requestType_idx";

-- DropIndex
DROP INDEX "PatientPrescriptionSubmission_reviewedByPharmacyId_idx";

-- AlterTable
ALTER TABLE "PatientPrescriptionSubmission" DROP COLUMN "createdAt",
DROP COLUMN "imageUrl",
DROP COLUMN "notes",
DROP COLUMN "ocrConfidence",
DROP COLUMN "rawDetectedText",
DROP COLUMN "requestType",
DROP COLUMN "reviewNote",
DROP COLUMN "reviewedAt",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "verificationDoctorId" TEXT;

-- AddForeignKey
ALTER TABLE "PatientPrescriptionSubmission" ADD CONSTRAINT "PatientPrescriptionSubmission_verificationDoctorId_fkey" FOREIGN KEY ("verificationDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

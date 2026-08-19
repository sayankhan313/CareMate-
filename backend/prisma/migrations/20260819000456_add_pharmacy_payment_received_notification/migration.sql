/*
  Warnings:

  - You are about to drop the `PatientPrescriptionChargeProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PHARMACY_PAYMENT_RECEIVED';

-- DropForeignKey
ALTER TABLE "PatientPrescriptionChargeProfile" DROP CONSTRAINT "PatientPrescriptionChargeProfile_patientId_fkey";

-- DropTable
DROP TABLE "PatientPrescriptionChargeProfile";

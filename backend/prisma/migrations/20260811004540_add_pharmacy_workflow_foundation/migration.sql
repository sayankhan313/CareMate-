/*
  Warnings:

  - A unique constraint covering the columns `[patientSubmissionId]` on the table `MedicineOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PrescriptionChargePreference" AS ENUM ('CHARGEABLE', 'EXEMPT', 'PPC');

-- CreateEnum
CREATE TYPE "PrescriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'NOT_REQUIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "PrescriptionExemptionType" AS ENUM ('AGE_BASED', 'MEDICAL_EXEMPTION', 'MATERNITY_EXEMPTION', 'LOW_INCOME_HC2', 'UNIVERSAL_CREDIT', 'PPC', 'OTHER');

-- CreateEnum
CREATE TYPE "ExemptionVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PatientPharmacyRequestType" AS ENUM ('PRESCRIPTION_UPLOAD', 'REFILL_REQUEST');

-- CreateEnum
CREATE TYPE "PatientPrescriptionSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUIRED', 'VERIFIED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MedicineOrderSource" AS ENUM ('DOCTOR_PRESCRIPTION', 'PATIENT_SUBMISSION', 'REFILL_REQUEST', 'MANUAL_REQUEST');

-- AlterTable
ALTER TABLE "MedicineOrder" ADD COLUMN     "orderSource" "MedicineOrderSource" NOT NULL DEFAULT 'MANUAL_REQUEST',
ADD COLUMN     "patientSubmissionId" TEXT,
ADD COLUMN     "prescriptionId" TEXT;

-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "quantity" TEXT;

-- CreateTable
CREATE TABLE "PatientPharmacyLink" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "chargePreference" "PrescriptionChargePreference" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPharmacyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyInventoryItem" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "strength" TEXT,
    "form" TEXT,
    "stockUnit" TEXT NOT NULL DEFAULT 'pack',
    "quantityInStock" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPrescriptionSubmission" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "reviewedByPharmacyId" TEXT,
    "requestType" "PatientPharmacyRequestType" NOT NULL DEFAULT 'PRESCRIPTION_UPLOAD',
    "imageUrl" TEXT,
    "notes" TEXT,
    "rawDetectedText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "status" "PatientPrescriptionSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPrescriptionSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPrescriptionSubmissionItem" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "medicineId" TEXT,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "quantity" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPrescriptionSubmissionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "medicineId" TEXT,
    "prescriptionItemId" TEXT,
    "submissionItemId" TEXT,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "quantity" TEXT,
    "instructions" TEXT,
    "dispensedQuantity" INTEGER,
    "quantityUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "chargePreference" "PrescriptionChargePreference" NOT NULL,
    "chargeableItemCount" INTEGER NOT NULL DEFAULT 0,
    "unitChargePence" INTEGER NOT NULL DEFAULT 0,
    "amountPence" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "providerPaymentIntentId" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "status" "PrescriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionExemptionClaim" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "pharmacyId" TEXT,
    "verifiedByPharmacyId" TEXT,
    "exemptionType" "PrescriptionExemptionType" NOT NULL,
    "referenceNumber" TEXT,
    "evidenceDocumentUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "ExemptionVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionExemptionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientPharmacyLink_patientId_isPrimary_idx" ON "PatientPharmacyLink"("patientId", "isPrimary");

-- CreateIndex
CREATE INDEX "PatientPharmacyLink_pharmacyId_idx" ON "PatientPharmacyLink"("pharmacyId");

-- CreateIndex
CREATE INDEX "PatientPharmacyLink_chargePreference_idx" ON "PatientPharmacyLink"("chargePreference");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPharmacyLink_patientId_pharmacyId_key" ON "PatientPharmacyLink"("patientId", "pharmacyId");

-- CreateIndex
CREATE INDEX "PharmacyInventoryItem_pharmacyId_isActive_idx" ON "PharmacyInventoryItem"("pharmacyId", "isActive");

-- CreateIndex
CREATE INDEX "PharmacyInventoryItem_pharmacyId_medicineName_idx" ON "PharmacyInventoryItem"("pharmacyId", "medicineName");

-- CreateIndex
CREATE INDEX "PharmacyInventoryItem_quantityInStock_idx" ON "PharmacyInventoryItem"("quantityInStock");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_patientId_status_idx" ON "PatientPrescriptionSubmission"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_pharmacyId_status_idx" ON "PatientPrescriptionSubmission"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_reviewedByPharmacyId_idx" ON "PatientPrescriptionSubmission"("reviewedByPharmacyId");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_requestType_idx" ON "PatientPrescriptionSubmission"("requestType");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_createdAt_idx" ON "PatientPrescriptionSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmissionItem_submissionId_idx" ON "PatientPrescriptionSubmissionItem"("submissionId");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmissionItem_medicineId_idx" ON "PatientPrescriptionSubmissionItem"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineOrderItem_orderId_idx" ON "MedicineOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "MedicineOrderItem_medicineId_idx" ON "MedicineOrderItem"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineOrderItem_prescriptionItemId_idx" ON "MedicineOrderItem"("prescriptionItemId");

-- CreateIndex
CREATE INDEX "MedicineOrderItem_submissionItemId_idx" ON "MedicineOrderItem"("submissionItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionPayment_orderId_key" ON "PrescriptionPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionPayment_providerPaymentIntentId_key" ON "PrescriptionPayment"("providerPaymentIntentId");

-- CreateIndex
CREATE INDEX "PrescriptionPayment_status_idx" ON "PrescriptionPayment"("status");

-- CreateIndex
CREATE INDEX "PrescriptionPayment_createdAt_idx" ON "PrescriptionPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionExemptionClaim_orderId_key" ON "PrescriptionExemptionClaim"("orderId");

-- CreateIndex
CREATE INDEX "PrescriptionExemptionClaim_pharmacyId_status_idx" ON "PrescriptionExemptionClaim"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PrescriptionExemptionClaim_verifiedByPharmacyId_idx" ON "PrescriptionExemptionClaim"("verifiedByPharmacyId");

-- CreateIndex
CREATE INDEX "PrescriptionExemptionClaim_status_idx" ON "PrescriptionExemptionClaim"("status");

-- CreateIndex
CREATE INDEX "PrescriptionExemptionClaim_expiresAt_idx" ON "PrescriptionExemptionClaim"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineOrder_patientSubmissionId_key" ON "MedicineOrder"("patientSubmissionId");

-- CreateIndex
CREATE INDEX "MedicineOrder_prescriptionId_idx" ON "MedicineOrder"("prescriptionId");

-- CreateIndex
CREATE INDEX "MedicineOrder_patientSubmissionId_idx" ON "MedicineOrder"("patientSubmissionId");

-- CreateIndex
CREATE INDEX "MedicineOrder_orderSource_idx" ON "MedicineOrder"("orderSource");

-- AddForeignKey
ALTER TABLE "PatientPharmacyLink" ADD CONSTRAINT "PatientPharmacyLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPharmacyLink" ADD CONSTRAINT "PatientPharmacyLink_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyInventoryItem" ADD CONSTRAINT "PharmacyInventoryItem_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescriptionSubmission" ADD CONSTRAINT "PatientPrescriptionSubmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescriptionSubmission" ADD CONSTRAINT "PatientPrescriptionSubmission_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescriptionSubmission" ADD CONSTRAINT "PatientPrescriptionSubmission_reviewedByPharmacyId_fkey" FOREIGN KEY ("reviewedByPharmacyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescriptionSubmissionItem" ADD CONSTRAINT "PatientPrescriptionSubmissionItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PatientPrescriptionSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPrescriptionSubmissionItem" ADD CONSTRAINT "PatientPrescriptionSubmissionItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_patientSubmissionId_fkey" FOREIGN KEY ("patientSubmissionId") REFERENCES "PatientPrescriptionSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_submissionItemId_fkey" FOREIGN KEY ("submissionItemId") REFERENCES "PatientPrescriptionSubmissionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionPayment" ADD CONSTRAINT "PrescriptionPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionExemptionClaim" ADD CONSTRAINT "PrescriptionExemptionClaim_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionExemptionClaim" ADD CONSTRAINT "PrescriptionExemptionClaim_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionExemptionClaim" ADD CONSTRAINT "PrescriptionExemptionClaim_verifiedByPharmacyId_fkey" FOREIGN KEY ("verifiedByPharmacyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

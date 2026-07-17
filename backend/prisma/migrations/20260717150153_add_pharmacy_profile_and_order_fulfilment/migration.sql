/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber]` on the table `MedicineOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MedicineOrderRequestSource" AS ENUM ('PATIENT', 'CAREGIVER', 'DOCTOR');

-- CreateEnum
CREATE TYPE "PharmacyOrderNoteVisibility" AS ENUM ('PATIENT_VISIBLE', 'CAREGIVER_VISIBLE', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "PharmacyOrderNoteType" AS ENUM ('GENERAL', 'DELAY', 'OUT_OF_STOCK', 'COLLECTION', 'DELIVERY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MedicineOrderStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "MedicineOrderStatus" ADD VALUE 'REJECTED';
ALTER TYPE "MedicineOrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "MedicineOrderStatus" ADD VALUE 'COLLECTED';
ALTER TYPE "MedicineOrderStatus" ADD VALUE 'DELAYED';
ALTER TYPE "MedicineOrderStatus" ADD VALUE 'OUT_OF_STOCK';

-- AlterTable
ALTER TABLE "MedicineOrder" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "caregiverId" TEXT,
ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "delayedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "dose" TEXT,
ADD COLUMN     "fulfilmentAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "medicineName" TEXT NOT NULL DEFAULT 'Medicine request',
ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "outForDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "outOfStockAt" TIMESTAMP(3),
ADD COLUMN     "pharmacyId" TEXT,
ADD COLUMN     "preparingAt" TIMESTAMP(3),
ADD COLUMN     "prescriptionConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prescriptionConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "quantity" TEXT NOT NULL DEFAULT 'Not specified',
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "requestNote" TEXT,
ADD COLUMN     "requestedByName" TEXT,
ADD COLUMN     "requestedByRole" "MedicineOrderRequestSource" NOT NULL DEFAULT 'PATIENT',
ADD COLUMN     "statusReason" TEXT;

-- CreateTable
CREATE TABLE "PharmacyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pharmacyName" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "openingHours" TEXT,
    "serviceType" TEXT,
    "licenseDocumentUrl" TEXT NOT NULL,
    "addressProofDocumentUrl" TEXT,
    "notifyNewOrders" BOOLEAN NOT NULL DEFAULT true,
    "notifyStatusReminders" BOOLEAN NOT NULL DEFAULT true,
    "notifyDelayedOrders" BOOLEAN NOT NULL DEFAULT false,
    "verificationCheckedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "changedById" TEXT,
    "fromStatus" "MedicineOrderStatus",
    "toStatus" "MedicineOrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineOrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyOrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "noteType" "PharmacyOrderNoteType" NOT NULL DEFAULT 'GENERAL',
    "visibility" "PharmacyOrderNoteVisibility" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyOrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyProfile_userId_key" ON "PharmacyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyProfile_registrationNumber_key" ON "PharmacyProfile"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyProfile_licenseNumber_key" ON "PharmacyProfile"("licenseNumber");

-- CreateIndex
CREATE INDEX "PharmacyProfile_registrationNumber_idx" ON "PharmacyProfile"("registrationNumber");

-- CreateIndex
CREATE INDEX "PharmacyProfile_licenseNumber_idx" ON "PharmacyProfile"("licenseNumber");

-- CreateIndex
CREATE INDEX "PharmacyProfile_city_idx" ON "PharmacyProfile"("city");

-- CreateIndex
CREATE INDEX "PharmacyProfile_postcode_idx" ON "PharmacyProfile"("postcode");

-- CreateIndex
CREATE INDEX "MedicineOrderStatusHistory_orderId_idx" ON "MedicineOrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "MedicineOrderStatusHistory_changedById_idx" ON "MedicineOrderStatusHistory"("changedById");

-- CreateIndex
CREATE INDEX "MedicineOrderStatusHistory_toStatus_idx" ON "MedicineOrderStatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "MedicineOrderStatusHistory_createdAt_idx" ON "MedicineOrderStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "PharmacyOrderNote_orderId_idx" ON "PharmacyOrderNote"("orderId");

-- CreateIndex
CREATE INDEX "PharmacyOrderNote_pharmacyId_idx" ON "PharmacyOrderNote"("pharmacyId");

-- CreateIndex
CREATE INDEX "PharmacyOrderNote_visibility_idx" ON "PharmacyOrderNote"("visibility");

-- CreateIndex
CREATE INDEX "PharmacyOrderNote_createdAt_idx" ON "PharmacyOrderNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineOrder_orderNumber_key" ON "MedicineOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "MedicineOrder_pharmacyId_idx" ON "MedicineOrder"("pharmacyId");

-- CreateIndex
CREATE INDEX "MedicineOrder_doctorId_idx" ON "MedicineOrder"("doctorId");

-- CreateIndex
CREATE INDEX "MedicineOrder_caregiverId_idx" ON "MedicineOrder"("caregiverId");

-- CreateIndex
CREATE INDEX "MedicineOrder_createdAt_idx" ON "MedicineOrder"("createdAt");

-- AddForeignKey
ALTER TABLE "PharmacyProfile" ADD CONSTRAINT "PharmacyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderStatusHistory" ADD CONSTRAINT "MedicineOrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderStatusHistory" ADD CONSTRAINT "MedicineOrderStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyOrderNote" ADD CONSTRAINT "PharmacyOrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyOrderNote" ADD CONSTRAINT "PharmacyOrderNote_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

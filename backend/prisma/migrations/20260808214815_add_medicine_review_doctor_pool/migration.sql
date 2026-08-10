-- CreateEnum
CREATE TYPE "MedicineReviewPoolDecision" AS ENUM ('APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MedicineReviewRoutingStatus" ADD VALUE 'POOL_ASSIGNED';
ALTER TYPE "MedicineReviewRoutingStatus" ADD VALUE 'POOL_REVIEW_COMPLETED';
ALTER TYPE "MedicineReviewRoutingStatus" ADD VALUE 'RELEASED';

-- AlterTable
ALTER TABLE "MedicineReviewRequest" ADD COLUMN     "adminReleasedAt" TIMESTAMP(3),
ADD COLUMN     "poolAssignedAt" TIMESTAMP(3),
ADD COLUMN     "poolDecision" "MedicineReviewPoolDecision",
ADD COLUMN     "poolDoctorId" TEXT,
ADD COLUMN     "poolDoctorNote" TEXT,
ADD COLUMN     "poolReviewedAt" TIMESTAMP(3),
ADD COLUMN     "releasedByAdminId" TEXT;

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_poolDoctorId_routingStatus_idx" ON "MedicineReviewRequest"("poolDoctorId", "routingStatus");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_releasedByAdminId_idx" ON "MedicineReviewRequest"("releasedByAdminId");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_poolAssignedAt_idx" ON "MedicineReviewRequest"("poolAssignedAt");

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_poolDoctorId_fkey" FOREIGN KEY ("poolDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_releasedByAdminId_fkey" FOREIGN KEY ("releasedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

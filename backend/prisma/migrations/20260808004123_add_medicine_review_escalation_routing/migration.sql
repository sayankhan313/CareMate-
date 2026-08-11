-- CreateEnum
CREATE TYPE "MedicineReviewRoutingStatus" AS ENUM ('ASSIGNED', 'ADMIN_REVIEW_REQUIRED');

-- DropForeignKey
ALTER TABLE "MedicineReviewRequest" DROP CONSTRAINT "MedicineReviewRequest_doctorId_fkey";

-- AlterTable
ALTER TABLE "MedicineReviewRequest" ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "attemptedDoctorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "routingStatus" "MedicineReviewRoutingStatus" NOT NULL DEFAULT 'ASSIGNED',
ALTER COLUMN "doctorId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_routingStatus_status_idx" ON "MedicineReviewRequest"("routingStatus", "status");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_assignedAt_status_idx" ON "MedicineReviewRequest"("assignedAt", "status");

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

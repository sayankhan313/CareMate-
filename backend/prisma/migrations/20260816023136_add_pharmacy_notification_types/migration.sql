-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OUT_FOR_DELIVERY';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_COLLECTED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_DELAYED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OUT_OF_STOCK';
ALTER TYPE "NotificationType" ADD VALUE 'PHARMACY_EXEMPTION_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE 'PHARMACY_EXEMPTION_REJECTED';

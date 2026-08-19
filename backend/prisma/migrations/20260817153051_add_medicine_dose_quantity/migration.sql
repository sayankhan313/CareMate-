-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "doseQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "doseUnit" TEXT;

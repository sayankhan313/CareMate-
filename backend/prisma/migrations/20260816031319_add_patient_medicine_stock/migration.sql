-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "currentStock" INTEGER,
ADD COLUMN     "hasMedicineOnHand" BOOLEAN,
ADD COLUMN     "lowStockThreshold" INTEGER,
ADD COLUMN     "stockUnit" TEXT;

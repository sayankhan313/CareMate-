-- AlterTable
ALTER TABLE "MedicineOrderItem" ADD COLUMN     "dispensedUnit" TEXT;

-- AlterTable
ALTER TABLE "PharmacyInventoryItem" ADD COLUMN     "packSize" INTEGER,
ADD COLUMN     "packUnit" TEXT;

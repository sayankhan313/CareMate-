/*
  Warnings:

  - You are about to drop the column `packSize` on the `PharmacyInventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `packUnit` on the `PharmacyInventoryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MedicineOrderItem" ADD COLUMN     "lineTotalPence" INTEGER,
ADD COLUMN     "unitPricePence" INTEGER;

-- AlterTable
ALTER TABLE "MedicinePackReference" ADD COLUMN     "defaultUnitPricePence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PharmacyInventoryItem" DROP COLUMN "packSize",
DROP COLUMN "packUnit",
ADD COLUMN     "unitPricePence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MedicineOrderItem" ADD COLUMN     "inventoryConsumedAt" TIMESTAMP(3),
ADD COLUMN     "inventoryItemId" TEXT,
ADD COLUMN     "inventoryReleasedAt" TIMESTAMP(3),
ADD COLUMN     "inventoryReservedAt" TIMESTAMP(3),
ADD COLUMN     "inventoryReservedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "MedicineOrderItem_inventoryItemId_idx" ON "MedicineOrderItem"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "PharmacyInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

export type PharmacyInventoryItem = {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  quantityInStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PharmacyInventoryListResponse = {
  total: number;
  lowStockCount: number;
  items: PharmacyInventoryItem[];
};

export type CreatePharmacyInventoryItemInput = {
  medicineName: string;
  strength?: string;
  form?: string;
  stockUnit?: string;
  quantityInStock?: number;
  lowStockThreshold?: number;
};

export type UpdatePharmacyInventoryItemInput = {
  medicineName?: string;
  strength?: string | null;
  form?: string | null;
  stockUnit?: string;
  quantityInStock?: number;
  lowStockThreshold?: number;
};
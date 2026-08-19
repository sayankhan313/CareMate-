export type PharmacyInventoryItem = {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  unitPricePence: number;
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

export type PharmacyInventoryReferencePrice = {
  found: boolean;
  reference: {
    id: string;
    medicineName: string;
    strength: string;
    form: string;
    stockUnit: string;
    defaultUnitPricePence: number;
  } | null;
};

export type CreatePharmacyInventoryItemInput = {
  medicineName: string;
  strength?: string;
  form?: string;
  stockUnit?: string;
  unitPricePence?: number;
  quantityInStock?: number;
  lowStockThreshold?: number;
};

export type UpdatePharmacyInventoryItemInput = {
  medicineName?: string;
  strength?: string | null;
  form?: string | null;
  stockUnit?: string;
  unitPricePence?: number;
  quantityInStock?: number;
  lowStockThreshold?: number;
};
import { API_BASE_URL } from "../../constants/api";
import { getPharmacyAuthHeaders, readPharmacyResponse } from "./pharmacy-api.utils";

export type PharmacyInventoryItem = {
  id: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  stockUnit: string;
  packSize: number | null;
  contentUnit: string | null;
  unitPricePence: number;
  quantityInStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  packSize?: number;
  contentUnit?: string;
  unitPricePence?: number;
  quantityInStock?: number;
  lowStockThreshold?: number;
};

export type UpdatePharmacyInventoryItemInput = {
  medicineName?: string;
  strength?: string | null;
  form?: string | null;
  stockUnit?: string;
  packSize?: number;
  contentUnit?: string | null;
  unitPricePence?: number;
  quantityInStock?: number;
  lowStockThreshold?: number;
};

export type PharmacyInventoryQuery = {
  search?: string;
  lowStock?: boolean;
  active?: boolean;
  limit?: number;
};

export const pharmacyInventoryApi = {
  async getInventory(options?: PharmacyInventoryQuery) {
    const params = new URLSearchParams();

    if (options?.search?.trim()) params.set("search", options.search.trim());
    if (options?.lowStock !== undefined) params.set("lowStock", String(options.lowStock));
    if (options?.active !== undefined) params.set("active", String(options.active));
    if (options?.limit !== undefined) params.set("limit", String(options.limit));

    const query = params.toString();

    const response = await fetch(`${API_BASE_URL}/pharmacy/inventory${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: await getPharmacyAuthHeaders(),
    });

    return readPharmacyResponse<PharmacyInventoryListResponse>(response);
  },

  async getReferencePrice(medicineName: string, strength?: string) {
    const params = new URLSearchParams({ medicineName: medicineName.trim() });
    if (strength?.trim()) params.set("strength", strength.trim());

    const response = await fetch(`${API_BASE_URL}/pharmacy/inventory/reference-price?${params.toString()}`, {
      method: "GET",
      headers: await getPharmacyAuthHeaders(),
    });

    return readPharmacyResponse<PharmacyInventoryReferencePrice>(response);
  },

  async createInventoryItem(input: CreatePharmacyInventoryItemInput) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/inventory`, {
      method: "POST",
      headers: { ...(await getPharmacyAuthHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    return readPharmacyResponse<{ item: PharmacyInventoryItem }>(response);
  },

  async updateInventoryItem(itemId: string, input: UpdatePharmacyInventoryItemInput) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/inventory/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers: { ...(await getPharmacyAuthHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    return readPharmacyResponse<{ item: PharmacyInventoryItem }>(response);
  },

  async archiveInventoryItem(itemId: string) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/inventory/${encodeURIComponent(itemId)}/archive`, {
      method: "PATCH",
      headers: await getPharmacyAuthHeaders(),
    });

    return readPharmacyResponse<{ item: PharmacyInventoryItem }>(response);
  },

  async restoreInventoryItem(itemId: string) {
    const response = await fetch(`${API_BASE_URL}/pharmacy/inventory/${encodeURIComponent(itemId)}/restore`, {
      method: "PATCH",
      headers: await getPharmacyAuthHeaders(),
    });

    return readPharmacyResponse<{ item: PharmacyInventoryItem }>(response);
  },
};
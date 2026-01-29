export type MovementSourceType =
  | "manual"
  | "purchase"
  | "sale"
  | "damage"
  | "adjustment";

export interface CreateItemInput {
  name: string;
  unit: string;
  averageCost: number;
  minQuantity?: number;
}

export interface StockMovement {
  itemId: number;
  quantity: number;
  sourceType?: MovementSourceType;
  sourceId: number | null;
}

export interface StockInInput extends StockMovement {
  type: "IN";
  unitCost: number;
}

export interface StockOutInput extends StockMovement {
  type: "OUT";
}

export interface ArchiveItemInput {
  itemId: number;
}

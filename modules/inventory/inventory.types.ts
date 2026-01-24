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

export interface StockInInput {
  itemId: number;
  type: "IN";
  quantity: number;
  unitCost: number;
  sourceType: MovementSourceType;
  sourceId: number | null;
}

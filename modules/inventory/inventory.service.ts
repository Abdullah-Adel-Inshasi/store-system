import { eq, sql } from "drizzle-orm";
import { db } from "../../db/db";
import { inventoryItems, inventoryMovements } from "../../db/schema";
import {
  CreateItemInput,
  StockInInput,
  StockOutInput,
} from "./inventory.types";

export async function createItem({
  name,
  unit,
  averageCost,
  minQuantity = 0,
}: CreateItemInput) {
  const [item] = await db
    .insert(inventoryItems)
    .values({ name, unit, averageCost: averageCost.toString(), minQuantity })
    .returning();
  return item;
}

export async function stockIn(input: StockInInput) {
  const {
    itemId,
    quantity,
    sourceId = null,
    sourceType = "manual",
    unitCost,
  } = input;
  validateQuantity(quantity);

  await db.transaction(async (tx) => {
    await tx.insert(inventoryMovements).values({
      itemId,
      quantity,
      type: "IN",
      sourceId,
      unitCost: unitCost.toString(),
      sourceType,
    });
    await tx
      .update(inventoryItems)
      .set({
        currentQuantity: sql`inventoryItems.currentQuantity + ${quantity}`,
      })
      .where(eq(inventoryItems.id, itemId));
  });
}

export async function stockOut(input: StockOutInput) {
  const { itemId, quantity, sourceId, sourceType = "manual" } = input;
  validateQuantity(quantity);

  await db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId))
      .limit(1);

    if (!item) throw new Error("Item not found");
    if (item.currentQuantity < quantity) throw new Error("Insuffecient stock");

    tx.insert(inventoryMovements).values({
      itemId,
      type: "OUT",
      quantity,
      sourceType,
      sourceId,
    });

    tx.update(inventoryItems)
      .set({
        currentQuantity: sql`inventoryItems.currentQuantity - ${quantity}`,
      })
      .where(eq(inventoryItems.id, itemId));
  });
}

function validateQuantity(quantity: number) {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater then zero");
  }
}

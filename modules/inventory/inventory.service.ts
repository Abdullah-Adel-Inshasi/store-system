import { eq, sql } from "drizzle-orm";
import { db } from "../../db/db";
import { inventoryItems, inventoryMovements } from "../../db/schema";
import { CreateItemInput, StockInInput } from "./inventory.types";

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
  if (quantity <= 0) {
    throw new Error("Quantity must be greater then zero");
  }

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

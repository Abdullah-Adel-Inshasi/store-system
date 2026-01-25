import { and, eq, isNull, sql } from "drizzle-orm";
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
    const {
      rows: [item],
    } = await tx.execute<InventoryItemRow>(sql`
      SELECT *
      FROM inventory_items
      WHERE id = ${itemId}
        AND deleted_at IS NULL
      FOR UPDATE
    `);

    if (!item) throw new Error("ITEM_NOT_FOUND_OR_ARCHIVED");
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
        currentQuantity: sql`${inventoryItems.currentQuantity} + ${quantity}`,
      })
      .where(eq(inventoryItems.id, itemId));
  });
}

export async function stockOut(input: StockOutInput) {
  const { itemId, quantity, sourceId, sourceType = "manual" } = input;

  validateQuantity(quantity);

  await db.transaction(async (tx) => {
    // lock + load the item
    const item = await getAndLockItemById(tx, itemId);

    //business rule 
    if (item.currentQuantity < quantity) throw new Error("INSUFFICIENT_STOCK");

    await tx.insert(inventoryMovements).values({
      itemId,
      type: "OUT",
      quantity,
      sourceType,
      sourceId,
    });

    await tx
      .update(inventoryItems)
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

export async function getItemById(
  id: number,
  options?: { includeArchived?: boolean },
) {
  const whereClause = options?.includeArchived
    ? eq(inventoryItems, id)
    : and(eq(inventoryItems, id), isNull(inventoryItems.deletedAt));

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(whereClause)
    .limit(1);

  if (!item) {
    throw new Error("ITEM_NOT_FOUND");
  }

  return item;
}

async function getAndLockItemById(tx: DBTransaction, itemId: number) {
  const {
    rows: [item],
  } = await tx.execute<InventoryItemRow>(sql`
      SELECT *
      FROM inventory_items
      WHERE id = ${itemId}
      AND deleted_at IS NULL 
      FOR UPDATE
      `);

  if (!item) throw new Error("ITEM_NOT_FOUND_OR_ARCHIVED");
  return item;
}

type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

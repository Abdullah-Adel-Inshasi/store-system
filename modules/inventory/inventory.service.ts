import { and, eq, isNull, sql } from "drizzle-orm";
import { Decimal } from "decimal.js";
import {
  CreateItemInput,
  StockInInput,
  StockMovement,
  StockOutInput,
} from "./inventory.types";
import { db } from "../../db/db";
import { inventoryItems, inventoryMovements } from "../../db/schema";

export async function createItem({
  name,
  unit,
  averageCost,
  minQuantity = 0,
}: CreateItemInput) {
  const [item] = await db
    .insert(inventoryItems)
    .values({
      name,
      unit,
      averageCost: averageCost.toString(),
      minQuantity: minQuantity.toString(),
    })
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
  validateQuantity(new Decimal(quantity));

  await db.transaction(async (tx) => {
    const item = await getAndLockItemById(tx, itemId);

    await tx.insert(inventoryMovements).values({
      itemId,
      quantity: quantity.toString(),
      type: "IN",
      sourceId,
      unitCost: unitCost.toString(),
      sourceType,
    });
    increaseStock(tx, item.id, quantity);
  });
}

export async function stockOut(input: StockOutInput) {
  const { itemId, quantity, sourceId, sourceType = "manual" } = input;

  validateQuantity(new Decimal(quantity));

  await db.transaction(async (tx) => {
    // lock + load the item
    const item = await getAndLockItemById(tx, itemId);

    //business rule
    assertSufficientStock(
      new Decimal(item.currentQuantity),
      new Decimal(quantity),
    );

    await tx.insert(inventoryMovements).values({
      itemId,
      type: "OUT",
      quantity: quantity.toString(),
      sourceType,
      sourceId,
    });

    decreaseStock(tx, item.id, quantity);
  });
}

function validateQuantity(quantity: Decimal) {
  if (!quantity.isFinite() || quantity.lte(0)) {
    throw new Error("INVALID_QUANTITY");
  }
  return quantity;
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

function assertSufficientStock(available: Decimal, toRemove: Decimal) {
  if (!toRemove.isFinite() || toRemove.lte(0))
    throw new Error("INVALID_QUANTITY");
  if (available.lt(toRemove)) throw new Error("INSUFFICIENT_STOCK");
}

async function increaseStock(
  tx: DBTransaction,
  itemId: InventoryItemRow["id"],
  quantity: StockMovement["quantity"],
) {
  tx.update(inventoryItems)
    .set({
      currentQuantity: sql`${inventoryItems.currentQuantity} + ${quantity}`,
    })
    .where(eq(inventoryItems.id, itemId));
}

async function decreaseStock(
  tx: DBTransaction,
  itemId: InventoryItemRow["id"],
  quantity: StockMovement["quantity"],
) {
  tx.update(inventoryItems)
    .set({
      currentQuantity: sql`${inventoryItems.currentQuantity} - ${quantity}`,
    })
    .where(eq(inventoryItems.id, itemId));
}

type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

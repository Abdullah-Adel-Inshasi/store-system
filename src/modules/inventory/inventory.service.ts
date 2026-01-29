import { inventoryItems, inventoryMovements } from "@/src/database/scheme";
import { inventoryBalances } from "@/src/database/scheme/inventory.schema";
import { withTransaction } from "@/src/database/transaction";
import Decimal from "decimal.js";
import { eq, sql } from "drizzle-orm";

export async function createItem({
  name,
  unit,
}: typeof inventoryItems.$inferInsert): Promise<
  typeof inventoryItems.$inferSelect
> {
  return await withTransaction(async (tx) => {
    if (!name) {
      throw new Error("NAME_IS_EMPTY");
    }

    if (!["kg", "g", "m", "piece"].includes(unit)) {
      throw new Error("INVALID_UNIT");
    }

    const [item] = await tx
      .insert(inventoryItems)
      .values({ name, unit })
      .returning();

    if (!item) {
      throw new Error("SERVER_ERROR");
    }

    return item;
  });
}

export async function archiveItem(itemId: string) {
  return await withTransaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId));

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    if (!item.isActive) {
      throw new Error("ITEM_ARCHIVED");
    }

    const [archived] = await tx
      .update(inventoryItems)
      .set({ isActive: false })
      .where(eq(inventoryItems.id, itemId))
      .returning({ id: inventoryItems.id, isActive: inventoryItems.isActive });

    return archived;
  });
}

export async function getItem(itemId: string) {
  return await withTransaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId));
    if (!item || !item.isActive) {
      throw new Error("ITEM_NOT_FOUND");
    }
    return item;
  });
}

export async function addItemQuantity({
  itemId,
  qty,
  cost,
  refType,
  refId,
}: {
  itemId: string;
  qty: string;
  cost: string;
  refType: string;
  refId?: string;
}) {
  return await withTransaction(async (tx) => {
    if (Decimal(qty).lte(0)) {
      throw new Error("INVALID_QUANTITY");
    }

    const {
      rows: [itemBalance],
    } = await tx.execute<typeof inventoryBalances.$inferSelect>(sql`
        SELECT * 
        FROM ${inventoryBalances}
        WHERE ${inventoryBalances.itemId} = ${itemId}
        FOR UPDATE
        `);

    if (!itemBalance) {
      throw new Error("ITEM_BALANCE_NOT_FOUND");
    }

    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId));

    if (!item || !item.isActive) {
      throw new Error("ITEM_NOT_FOUND");
    }

    await tx.insert(inventoryMovements).values({
      itemId,
      qtyChange: qty,
      unitCost: cost,
      refType,
      refId,
    });

    const updatedAvgCost = Decimal.add(
      Decimal(cost).dividedBy(qty),
      Decimal(itemBalance.avgCost).times(itemBalance.qtyOnHand),
    ).dividedBy(qty + itemBalance.qtyOnHand);
    const updatedItemQty = Decimal.add(itemBalance.qtyOnHand, qty);

    const [updatedBalance] = await tx
      .update(inventoryBalances)
      .set({
        avgCost: updatedAvgCost.toString(),
        qtyOnHand: updatedItemQty.toString(),
      })
      .returning();
    return updatedBalance;
  });
}

export async function removeItemQuantity({
  itemId,
  qty,
  cost,
  refType,
  refId,
}: {
  itemId: string;
  qty: string;
  cost: string;
  refType: string;
  refId?: string;
}) {}

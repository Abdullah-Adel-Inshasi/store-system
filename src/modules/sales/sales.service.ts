import { eq, sql } from "drizzle-orm";
import { withTransaction } from "@/src/database/transaction";
import { SellCashInput } from "./sales.types";
import {
  inventoryBalances,
  inventoryMovements,
} from "@/src/database/scheme/inventory.schema";
import {
  accountBalances,
  moneyMovements,
} from "@/src/database/scheme/cash.schema";
import { saleItems, sales } from "@/src/database/scheme/sales.schema";
import Decimal from "decimal.js";

export async function sellCash({
  accountId,
  itemId,
  quantity,
  soldAt,
  unitPrice,
}: SellCashInput) {
  return withTransaction(async (tx) => {
    if (quantity.lte(0)) {
      throw new Error("INVALID_QUANTITY");
    }

    if (unitPrice.lt(0)) {
      throw new Error("INVALID_PRICE");
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
      throw new Error("ITEM_NOT_FOUND");
    }
    const nextQuantity = Decimal(itemBalance.qtyOnHand).minus(quantity);
    if (nextQuantity.isNegative()) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    const {
      rows: [accountBalance],
    } = await tx.execute<typeof accountBalances.$inferSelect>(sql`
            SELECT * 
            FROM ${accountBalances}
            WHERE ${accountBalances.accountId} = ${accountId}
            FOR UPDATE
            `);

    const total = quantity.mul(unitPrice);

    if (!accountBalance) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const [sale] = await tx
      .insert(sales)
      .values({ accountId, soldAt, status: "completed" })
      .returning();

    await tx.insert(saleItems).values({
      itemId,
      quantity: quantity.toString(),
      saleId: sale!.id,
      unitPrice: unitPrice.toString(),
    });

    await tx.insert(inventoryMovements).values({
      itemId,
      qtyChange: quantity.negated().toString(),
      refType: "sale",
      refId: sale!.id,
      unitCost: unitPrice.toString(),
    });

    const [updatedInventory] = await tx
      .update(inventoryBalances)
      .set({ qtyOnHand: sql`${inventoryBalances.qtyOnHand} - ${quantity}` })
      .where(eq(inventoryBalances.itemId, itemId))
      .returning();

    await tx.insert(moneyMovements).values({
      accountId,
      amount: total.toString(),
      reason: "cash sale",
      refType: "sale",
      refId: sale!.id,
    });

    const updatedCash = await tx
      .update(accountBalances)
      .set({ balance: sql`${accountBalances.balance} + ${total}` })
      .where(eq(accountBalances.accountId, accountId))
      .returning();

    return { saleId: sale?.id, inventory: updatedInventory, cash: updatedCash };
  });
}

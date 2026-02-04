import { db } from "@/src/database/db";
import { inventoryMovements } from "@/src/database/scheme";
import {
  accountBalances,
  moneyMovements,
} from "@/src/database/scheme/cash.schema";
import { inventoryBalances } from "@/src/database/scheme/inventory.schema";
import {
  purchaseItems,
  purchases,
} from "@/src/database/scheme/purchases.schema";
import { withTransaction } from "@/src/database/transaction";
import { Decimal } from "decimal.js";
import { eq, sql, desc } from "drizzle-orm";

export async function purchaseCash({
  quantity,
  unitPrice,
  accountId,
  itemId,
}: {
  quantity: Decimal;
  unitPrice: Decimal;
  accountId: string;
  itemId: string;
}) {
  return withTransaction(async (tx) => {
    if (quantity.lessThanOrEqualTo(0)) {
      throw new Error("INVALID_QUANTITY");
    }

    if (unitPrice.lessThan(0)) {
      throw new Error("INVALID_PRICE");
    }
    const {
      rows: [inventoryBalance],
    } = await tx.execute<typeof inventoryBalances.$inferSelect>(
      sql`
            SELECT * 
            FROM ${inventoryBalances}
            WHERE ${inventoryBalances.itemId} = ${itemId}
            FOR UPDATE`,
    );
    const {
      rows: [accountBalance],
    } = await tx.execute<typeof accountBalances.$inferSelect>(sql`
        SELECT *
        FROM ${accountBalances}
        WHERE ${accountBalances.accountId} = ${accountId}
        FOR UPDATE
        `);

    if (!accountBalance) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (!inventoryBalance) {
      throw new Error("ITEM_NOT_FOUND");
    }

    const total = quantity.mul(unitPrice);

    const nextCash = Decimal(accountBalance.balance).minus(total);
    if (nextCash.isNegative()) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    const [purchase] = await tx
      .insert(purchases)
      .values({
        accountId,
        status: "completed",
      })
      .returning();

    await tx.insert(purchaseItems).values({
      itemId: itemId,
      purchaseId: purchase!.id,
      quantity: quantity.toString(),
      unitCost: unitPrice.toString(),
    });

    await tx.insert(inventoryMovements).values({
      itemId,
      qtyChange: quantity.toString(),
      refType: "purchase",
      refId: purchase!.id,
    });

    await tx.insert(moneyMovements).values({
      accountId,
      amount: total.negated().toString(),
      reason: "purchase",
      refId: purchase!.id,
      refType: "purchase",
    });

    const oldQty = Decimal(inventoryBalance.qtyOnHand);
    const oldAvg = Decimal(inventoryBalance.avgCost);

    const newQty = quantity;
    const newAvgCost = oldQty.plus(newQty).eq(0)
      ? unitPrice
      : oldQty.mul(oldAvg).plus(newQty.mul(unitPrice)).div(oldQty.plus(newQty));

    await tx
      .update(inventoryBalances)
      .set({
        qtyOnHand: sql`${inventoryBalances.qtyOnHand} + ${quantity}`,
        avgCost: sql`${newAvgCost}`,
        updatedAt: sql`now()`,
      })
      .where(sql`${inventoryBalance.itemId} = ${itemId}`);

    const [updatedBalance] = await tx
      .update(accountBalances)
      .set({ balance: sql`${accountBalances.balance} - ${total}` })
      .where(eq(accountBalances.accountId, accountId))
      .returning();

    return updatedBalance;
  });
}

export async function getPurchases() {
  return db.select().from(purchases).orderBy(desc(purchases.purchasedAt));
}

import {
  accountBalances,
  AccountBalancesSelectType,
  moneyMovements,
  MoneyMovementsInsertType,
} from "@/src/database/scheme/cash.schema";
import { withTransaction } from "@/src/database/transaction";
import { eq, sql } from "drizzle-orm";

export async function deposit({
  accountId,
  amount,
  reason,
}: Pick<MoneyMovementsInsertType, "accountId" | "amount" | "reason">) {
  return withTransaction(async (tx) => {
    const balanceRow = await tx.execute<AccountBalancesSelectType>(sql`
        SELECT * 
        FROM ${accountBalances}
        WHERE ${accountBalances} = ${accountId}
        FOR UPDATE
        `);

    if (balanceRow.rowCount === 0) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    await tx.insert(moneyMovements).values({
      accountId,
      amount,
      reason,
      refType: "deposit",
    });

    const [updated] = await tx
      .update(accountBalances)
      .set({
        balance: sql`${accountBalances.balance} + ${amount}`,
      })
      .where(eq(accountBalances.accountId, accountId))
      .returning();

    return updated;
  });
}

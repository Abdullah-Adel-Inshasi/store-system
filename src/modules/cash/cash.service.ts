import {
  accountBalances,
  accounts,
  moneyMovements,
} from "@/src/database/scheme/cash.schema";
import { withTransaction } from "@/src/database/transaction";
import Decimal from "decimal.js";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { CashDomainError } from "./cash.errors";
import { ERRORS_AR } from "@/src/locales/ar";
import { DomainError } from "@/src/core/errors/DomainError";

export async function createAccount({ name }: typeof accounts.$inferInsert) {
  return withTransaction(async (tx) => {
    const [account] = await tx.insert(accounts).values({ name }).returning();

    return account;
  });
}

interface PaymentMethod {
  type: "cash";
  currency: "ILS" | "USD" | "JOD" | Object;
}

interface EServicePaymentMethod extends PaymentMethod {
  currency: PaymentMethod["currency"] | "AUD" | "CAD";
  IBAN: string;
  provider: "PayPal" | "BOP" | "Islamic Bank";
}

export async function addPaymentMethod({
  accountId,
  paymentMethod,
}: {
  accountId: string;
  paymentMethod: PaymentMethod | EServicePaymentMethod;
}) {
  return await withTransaction(async (tx) => {
    const [account] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));

    if (!account) {
      throw new DomainError({
        code: "ACCOUNT_NOT_FOUND",
        domain: "CASH SERVICE",
        message: ERRORS_AR.ACCOUNT_NOT_FOUND,
        status: 400,
      });

      //future: only people above 18 can add an e-service payment method
      await tx.insert(accountBalances);
    }
  });
}

export async function deposit({
  accountId,
  amount,
  reason,
}: Pick<
  typeof moneyMovements.$inferInsert,
  "accountId" | "amount" | "reason"
>) {
  return withTransaction(async (tx) => {
    const balanceRow = await tx.execute<
      typeof accountBalances.$inferSelect
    >(sql`
        SELECT * 
        FROM ${accountBalances}
        WHERE ${accountBalances} = ${accountId}
        FOR UPDATE
        `);

    if (balanceRow.rowCount === 0) {
      throw new CashDomainError("ACCOUNT_BALANCE_NOT_FOUND");
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

export async function withdraw({
  amount,
  accountId,
  reason,
}: Pick<
  typeof moneyMovements.$inferInsert,
  "accountId" | "amount" | "reason"
>) {
  return withTransaction(async (tx) => {
    if (Decimal(amount).gte(0)) {
      throw new Error("AMOUNT MUST BE NEGATIVE");
    }

    const {
      rows: [account],
    } = await tx.execute<typeof accountBalances.$inferSelect>(sql`
      SELECT * 
      FROM ${accountBalances}
      WHERE ${accountBalances.accountId} = ${accountId}
      FOR UPDATE
      `);

    if (!account) {
      throw new CashDomainError("ACCOUNT_NOT_FOUND");
    }
    const nextBalance = Decimal(account.balance).plus(amount);
    if (nextBalance.isNegative()) {
      throw new CashDomainError("INSUFFICIENT_FUNDS");
    }

    await tx.insert(moneyMovements).values({
      accountId: accountId,
      amount: amount,
      reason: reason,
      refType: "withdraw",
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

export async function transfer({
  fromAccountId,
  toAccountId,
  amount,
  reason = "",
}: {
  fromAccountId: string;
  toAccountId: string;
  amount: Decimal;
  reason: string;
}) {
  return withTransaction(async (tx) => {
    if (amount.lte(0)) {
      throw new CashDomainError("INVALID_AMOUNT");
    }

    if (fromAccountId === toAccountId) {
      throw new CashDomainError("SAME_ACCOUNT_TRANSFER");
    }

    const [firstId, secondId] =
      fromAccountId > toAccountId
        ? [toAccountId, fromAccountId]
        : [fromAccountId, toAccountId];

    const balances = await tx.execute<typeof accountBalances.$inferSelect>(sql`
          SELECT * 
          from ${accountBalances}
          WHERE ${accountBalances.accountId} IN (${firstId},${secondId})
          FOR UPDATE
          `);

    const fromBalance = balances.rows.find(
      (balance) => balance.accountId === fromAccountId,
    );

    const toBalance = balances.rows.find(
      (balance) => balance.accountId === toAccountId,
    );

    if (!fromBalance || !toBalance) {
      throw new CashDomainError("ACCOUNT_BALANCE_NOT_FOUND");
    }

    const nextFromBalance = Decimal(fromBalance.balance).minus(amount);

    if (nextFromBalance.isNegative()) {
      throw new CashDomainError("INSUFFICIENT_FUNDS");
    }

    const transferId = uuidv4();

    await tx.insert(moneyMovements).values({
      accountId: fromAccountId,
      amount: amount.negated().toString(),
      refType: "transfer",
      reason,
      refId: transferId,
    });

    await tx.insert(moneyMovements).values({
      accountId: toAccountId,
      amount: amount.toString(),
      refType: "transfer",
      reason,
      refId: transferId,
    });

    const [toBalanceUpdated] = await tx
      .update(accountBalances)
      .set({ balance: sql`${accountBalances.balance} + ${amount}` })
      .where(eq(accountBalances.accountId, toAccountId))
      .returning();
    const [fromBalanceUpdated] = await tx
      .update(accountBalances)
      .set({ balance: sql`${accountBalances.balance} - ${amount}` })
      .where(eq(accountBalances.accountId, fromAccountId))
      .returning();

    return { to: toBalanceUpdated, from: fromBalanceUpdated };
  });
}

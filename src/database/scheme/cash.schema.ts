import { decimalConfiguration } from "@/config/db.helpers";
import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // cash / bank
  currency: varchar("currency", { length: 3 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bankAccountDetails = pgTable(
  "bank_account_details",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accounts.id),
    phone: varchar("phone", { length: 20 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    phoneProviderUnique: unique("bank_account_phone_provider_unique").on(
      table.phone,
      table.provider,
    ),
  }),
);

export const moneyMovements = pgTable(
  "money_movements",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    accountId: uuid("account_id")
      .references(() => accounts.id)
      .notNull(),
    amount: decimal("amount", decimalConfiguration).notNull(),
    refId: uuid("ref_id"),
    refType: varchar("ref_type", { length: 20 }),
    reason: varchar("reason", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nonZeroAmount: check(
      "money_movements_non_zero_amount",
      sql`${table.amount} <> 0`,
    ),
  }),
);

export type MoneyMovementsInsertType = InferInsertModel<typeof moneyMovements>;
export type MoneyMovementsSelectType = InferSelectModel<typeof moneyMovements>;

export const accountBalances = pgTable("account_balances", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id),
  balance: decimal("balance", decimalConfiguration).default("0").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AccountBalancesInsertType = InferInsertModel<
  typeof accountBalances
>;
export type AccountBalancesSelectType = InferSelectModel<
  typeof accountBalances
>;

import {
  check,
  decimal,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory.schema";
import { sql } from "drizzle-orm";
import { accounts } from "./cash.schema";
import { decimalConfiguration } from "@/config/db.helpers";

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  soldAt: timestamp("sold_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
});
export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    unitPrice: decimal("unit_price", decimalConfiguration).notNull(),
    quantity: decimal("quantity", decimalConfiguration).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    positiveQuantity: check(
      "sale_items_qty_positive",
      sql`${table.quantity} > 0`,
    ),
    nonNegativePrice: check(
      "sale_items_price_non_negative",
      sql`${table.unitPrice} >= 0`,
    ),
    saleIdx: index("sale_items_sale_id_idx").on(table.saleId),
  }),
);

const bills = pgTable("bills", {
  id: uuid("id").notNull().defaultRandom(),
});

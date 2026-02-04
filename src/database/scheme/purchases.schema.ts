import {
  check,
  decimal,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./cash.schema";
import { inventoryItems } from "./inventory.schema";
import { sql } from "drizzle-orm";

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => accounts.id),
  purchasedAt: timestamp("purchased_at"),
  status: varchar("status", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export  const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id),
    quantity: decimal("quantity").notNull(),
    unitCost: decimal("unit_cost").notNull(),
  },
  (table) => ({
    positiveQuantity: check(
      "purchase_items_quantity_nonZero",
      sql`${table.quantity} > 0`,
    ),
    nonNegativePrice:check('purchase_items_price_nonNegative',sql`${table.unitCost} >= 0`)
  }),
);

import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  decimal,
  timestamp,
  uuid,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { decimalConfiguration } from "./constants";

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .references(() => inventoryItems.id)
      .notNull(),
    qtyChange: decimal("qty_change", decimalConfiguration).notNull(),
    unitCost: decimal("unit_cost", decimalConfiguration),

    refId: uuid("ref_id"),
    refType: varchar("ref_type", { length: 50 }), // sale, purchase, damage, manual

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    nonZeroQty: check(
      "inventory_movements_qty_nonzero",
      sql`${table.qtyChange} <> 0`,
    ),
  }),
);

export const inventoryBalances = pgTable("inventory_balances", {
  itemId: uuid("item_id")
    .primaryKey()
    .notNull()
    .references(() => inventoryItems.id),
  qtyOnHand: decimal("qty_on_hand", decimalConfiguration)
    .notNull()
    .default("0"),
  avgCost: decimal("avg_cost", decimalConfiguration).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

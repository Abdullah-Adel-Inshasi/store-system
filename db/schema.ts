import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

/* =========================
   PEOPLE
========================= */

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  dailyRate: decimal("daily_rate", { precision: 12, scale: 2 }).notNull(),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   INVENTORY
========================= */

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  currentQuantity: decimal("current_quantity", { precision: 14, scale: 3 })
    .default("0")
    .notNull(),
  averageCost: decimal("average_cost", { precision: 12, scale: 2 }).notNull(),
  minQuantity: decimal("min_quantity", { precision: 14, scale: 3 }).default(
    "0",
  ),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at").default(sql`null`),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .references(() => inventoryItems.id)
    .notNull(),
  type: varchar("type", { length: 10 }).notNull(), // IN | OUT | ADJUST
  quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
  sourceType: varchar("source_type", { length: 50 }), // sale, purchase, damage, manual
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   BALANCE SYSTEM
========================= */

export const balances = pgTable("balances", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Cashbox, Bank, Safe
  type: varchar("type", { length: 10 }).notNull(), // CASH | BANK | OTHER
  createdAt: timestamp("created_at").defaultNow(),
});

export const balanceTransactions = pgTable("balance_transactions", {
  id: serial("id").primaryKey(),
  balanceId: integer("balance_id")
    .references(() => balances.id)
    .notNull(),
  type: varchar("type", { length: 10 }).notNull(), // IN | OUT | TRANSFER
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   DEBTS
========================= */

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  partyType: varchar("party_type", { length: 20 }).notNull(), // SUPPLIER | CUSTOMER
  partyId: integer("party_id").notNull(),
  originalAmount: decimal("original_amount", {
    precision: 12,
    scale: 2,
  }).notNull(),
  remainingAmount: decimal("remaining_amount", {
    precision: 12,
    scale: 2,
  }).notNull(),
  sourceType: varchar("source_type", { length: 50 }), // sale, purchase
  sourceId: integer("source_id"),
  status: varchar("status", { length: 20 }).notNull(), // OPEN | PARTIAL | PAID
  createdAt: timestamp("created_at").defaultNow(),
});

export const debtPayments = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id")
    .references(() => debts.id)
    .notNull(),
  cashTransactionId: integer("cash_transaction_id")
    .references(() => balanceTransactions.id)
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
});

/* =========================
   WORKERS
========================= */

export const workerAttendance = pgTable("worker_attendance", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id")
    .references(() => workers.id)
    .notNull(),
  workDate: timestamp("work_date").notNull(),
  agreedWage: decimal("agreed_wage", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // PENDING | PAID
});

export const workerPayments = pgTable("worker_payments", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id")
    .references(() => workers.id)
    .notNull(),
  cashTransactionId: integer("cash_transaction_id")
    .references(() => balanceTransactions.id)
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
});

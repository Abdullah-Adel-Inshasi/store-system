import { check, decimal, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { accounts } from "./cash.schema";
import { sql } from "drizzle-orm";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .unique()
    .notNull()
    .references(() => accounts.id),
  name: varchar("username", { length: 35 }).notNull(),
  username: varchar("username", { length: 15 }).notNull().unique(),
});
const employees = pgTable(
  "employees",
  {
    userId: uuid("userId")
      .unique()
      .primaryKey()
      .references(() => users.id),
    wage: decimal("wage").notNull(),
  },
  ({ wage }) => ({
    positiveWage: check("employee_wage_positive_amount", sql`${wage} < 0`),
  }),
);

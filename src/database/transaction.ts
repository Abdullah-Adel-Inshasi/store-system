import { db } from "./db";
export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs a function inside a database transaction.
 * - Opens a transaction
 * - Commits on success
 * - Rolls back on error
 */
export async function withTransaction<T>(
  fn: (tx: DBTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    return fn(tx);
  });
}

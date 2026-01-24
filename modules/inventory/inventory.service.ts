import { db } from "../../db/db";
import { inventoryItems } from "../../db/schema";
import { CreateItemInput } from "./inventory.types";

export async function createItem({
  name,
  unit,
  averageCost,
  minQuantity = 0,
}: CreateItemInput) {
  const [item] = await db
    .insert(inventoryItems)
    .values({ name, unit, averageCost: averageCost.toString(), minQuantity })
    .returning();
  return item;
}



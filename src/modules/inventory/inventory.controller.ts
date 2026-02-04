import { Request, Response } from "express";
import {
  getInventoryItems,
  insertItem,
  InventoryBalanceList,
} from "./inventory.service";
import { inventoryItems } from "@/src/database/scheme";
import { validate } from "@/src/core/errors/DomainError";

export async function getItemsBalances(req: Request, res: Response) {
  const result = await InventoryBalanceList();
  return res.status(200).json(result);
}

export async function getItems(req: Request, res: Response) {
  const items = await getInventoryItems();
  return res.status(200).json(items);
}

export async function createItem(req: Request, res: Response) {
  const { name, unit } = req.body;
  const item = await insertItem({ name, unit });
  return res.status(201).json(item);
}

import { Request, Response } from "express";
import { getSales, sellCash } from "./sales.service";
import Decimal from "decimal.js";
import { sellCashSchema } from "./sales.validation";

export async function sellCashController(req: Request, res: Response) {
  const { accountId, quantity, unitPrice, soldAt, itemId } =
    sellCashSchema.parse({
      ...req.body,
      itemId: req.params,
    });

  const result = await sellCash({
    accountId,
    itemId: itemId,
    quantity: new Decimal(quantity),
    soldAt: soldAt ? new Date(soldAt) : new Date(),
    unitPrice: new Decimal(unitPrice),
  });

  res.status(201).json(result);
}

export async function getSalesController(req: Request, res: Response) {
  const result = await getSales();
  return res.status(200).json(result);
}

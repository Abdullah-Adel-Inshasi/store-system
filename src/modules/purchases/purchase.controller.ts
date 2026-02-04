import { Request, Response } from "express";
import { purchaseCashSchema } from "./purchase.validation";
import { getPurchases, purchaseCash } from "./purchase.service";
import Decimal from "decimal.js";
export async function purchaseItemController(req: Request, res: Response) {
  const { accountId, itemId, quantity, unitPrice } = purchaseCashSchema.parse({
    ...req.body,
    itemId: req.params.itemId,
  });

  const result = await purchaseCash({
    accountId,
    itemId,
    quantity: new Decimal(quantity),
    unitPrice: new Decimal(unitPrice),
  });

  res.status(201).json(result);
}


export async function getPurchasesController(req:Request,res:Response){
  const result =await getPurchases()
  res.status(200).json(result)
} 
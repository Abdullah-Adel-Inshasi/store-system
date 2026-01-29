import Decimal from "decimal.js";

export type SellCashInput = {
  itemId: string;
  quantity: Decimal;
  unitPrice: Decimal;
  accountId: string;
  soldAt: Date;
};

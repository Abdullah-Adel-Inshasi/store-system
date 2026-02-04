import z from "zod";

export const purchaseCashSchema = z.object({
  itemId: z.string().uuid(),
  accountId: z.string().uuid(),
  quantity: z.union([z.string(), z.number()]),
  unitPrice: z.union([z.string(), z.number()]),
});
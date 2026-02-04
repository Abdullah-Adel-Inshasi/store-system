import z from "zod";

export const sellCashSchema = z.object({
  itemId: z.string().uuid(),
  accountId: z.string().uuid(),
  quantity: z.union([z.string(), z.number()]),
  unitPrice: z.union([z.string(), z.number()]),
  soldAt: z.string().datetime().optional(),
});

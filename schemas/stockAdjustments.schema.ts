import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  product_id: z.number().int(),
  reason: z.string().min(1, "reason is required"),
  quantity_change: z
    .number()
    .int()
    .refine((n) => n! == 0, { message: "quantity change can't be 0" }),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

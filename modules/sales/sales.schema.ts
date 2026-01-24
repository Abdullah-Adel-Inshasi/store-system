import { z } from "zod";

export const salesSchema = z.object({
  product_id: z.number().int(),
  quantity: z.number().int().positive(),
});

export type SalesSchemaInput = z.infer<typeof salesSchema>;

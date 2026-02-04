import z from "zod";

export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .max(100, { error: "name can't be more than 100 characters" }),
  type: z.union([z.literal("cash"), z.literal("bank")]),
  currency: z.union(["USD", "ILS"].map((x) => z.literal(x))),
  isActive: z.boolean(),
  createdAt: z.date(),
});

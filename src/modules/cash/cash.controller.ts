import { Request, Response } from "express";
import { accountSchema } from "./cash.validation";
import { createAccount } from "./cash.service";

export async function createAccountController(req: Request, res: Response) {
  const { name } = accountSchema.parse(req.body);

  const result = await createAccount({ name });

  res.status(201).json(result);
}

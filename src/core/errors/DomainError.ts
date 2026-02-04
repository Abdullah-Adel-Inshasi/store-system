import { ZodError, z } from "zod";
import { Request, Response, NextFunction } from "express";

export  class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly domain: string;

   constructor(params: {
    domain: string;
    code: string;
    message: string;
    status: number;
  }) {
    super(params.message);
    this.name = "DomainError";
    this.code = params.code;
    this.status = params.status;
    this.domain = params.domain;
  }
}

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json(err);
  }

  if (err instanceof DomainError) {
    return res.status(err.status).json(err);
  }

  next();
}

export const validate =
  (schema: z.ZodAny) =>
  async (
    { params, query, body }: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // Validate all parts of the request (params, query, body) against the schema
      const {
        params: validatedParams,
        query: validatedQuery,
        body: validatedBody,
      } = await schema.parseAsync({
        params,
        query,
        body,
      });

      // Overwrite the original request properties with the validated and typed data
      params = validatedParams;
      query = validatedQuery;
      body = validatedBody;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(error);
      }
      next(error); // Pass other errors to the default error handler
    }
  };


import { DomainError } from "@/src/core/errors/DomainError";
import { CashErrors, CashErrorCode } from "./errors.catalog";

export class CashDomainError extends DomainError {
  constructor(code: CashErrorCode) {
    const def = CashErrors[code];
    super({
      domain: "cash",
      code,
      message: def.message,
      status: def.status,
    });
    this.name = "CashDomainError";
  }
}

export const CashErrors = {
  INVALID_AMOUNT: {
    code: "INVALID_AMOUNT",
    message: "Amount must be greater than zero",
    status: 400,
  },
  ACCOUNT_NOT_FOUND: {
    code: "ACCOUNT_NOT_FOUND",
    message: "Account not found",
    status: 404,
  },
  ACCOUNT_BALANCE_NOT_FOUND: {
    code: "ACCOUNT_BALANCE_NOT_FOUND",
    message: "Account balance not found",
    status: 404,
  },
  INSUFFICIENT_FUNDS: {
    code: "INSUFFICIENT_FUNDS",
    message: "Insufficient balance",
    status: 400,
  },
  SAME_ACCOUNT_TRANSFER: {
    code: "SAME_ACCOUNT_TRANSFER",
    message: "Cannot transfer to the same account",
    status: 400,
  },
} as const;

export type CashErrorCode = keyof typeof CashErrors;

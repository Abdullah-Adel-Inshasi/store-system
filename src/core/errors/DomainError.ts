export abstract class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly domain: string;

  protected constructor(params: {
    domain: string;
    code: string;
    message: string;
    status: number;
  }) {
    super(params.message);
    this.domain = params.domain;
    this.code = params.code;
    this.status = params.status;
    this.name = "DomainError";
  }
}

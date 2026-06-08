export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class InternalError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public internalMessage?: string,
  ) {
    super(message);
    this.name = "InternalError";
  }
}

export interface UsageLogEntry {
  requestId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

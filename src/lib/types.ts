export type ApiSuccess<T> = {
  status: number;
  message: string;
  refId: string;
  data: T;
};

export type ApiErrorResponse = {
  status: number;
  message: string;
  refId: string;
  data: null;
};

export class ApiError extends Error {
  constructor(
    public message: string,
    public refId: string
  ) {
    super(message);
  }
}

export type UnifiedResponse<T> = ApiSuccess<T> | ApiErrorResponse;

export function ok<T>(data: T, message = "Success", refId?: string): ApiSuccess<T> {
  return { status: 200, message, refId: refId ?? crypto.randomUUID(), data };
}

export function created<T>(data: T, message = "Created", refId?: string): ApiSuccess<T> {
  return { status: 201, message, refId: refId ?? crypto.randomUUID(), data };
}

export function err(status: number, message: string, refId?: string): ApiErrorResponse {
  return { status, message, refId: refId ?? crypto.randomUUID(), data: null };
}

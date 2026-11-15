export enum ErrorCode {
  // Authentication & Session
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  INVALID_PASSCODE = "INVALID_PASSCODE",

  // Authorization & Consent
  FORBIDDEN = "FORBIDDEN",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  CONSENT_REQUIRED = "CONSENT_REQUIRED",
  CONSENT_REVOKED = "CONSENT_REVOKED",
  CONSENT_EXPIRED = "CONSENT_EXPIRED",
  PATIENT_ACCESS_DENIED = "PATIENT_ACCESS_DENIED",

  // Resource & Entity
  NOT_FOUND = "NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND",
  MEDICATION_NOT_FOUND = "MEDICATION_NOT_FOUND",
  DOSE_NOT_FOUND = "DOSE_NOT_FOUND",
  APPOINTMENT_NOT_FOUND = "APPOINTMENT_NOT_FOUND",
  CARE_CIRCLE_NOT_FOUND = "CARE_CIRCLE_NOT_FOUND",
  INVITATION_NOT_FOUND = "INVITATION_NOT_FOUND",
  INVITATION_EXPIRED = "INVITATION_EXPIRED",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // Business Logic & Adherence
  DOSE_ALREADY_TAKEN = "DOSE_ALREADY_TAKEN",
  DOSE_WINDOW_EXPIRED = "DOSE_WINDOW_EXPIRED",
  DUPLICATE_PRESCRIPTION = "DUPLICATE_PRESCRIPTION",
  INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK",
  INVALID_SCHEDULE = "INVALID_SCHEDULE",

  // Concurrency & Infrastructure
  CONCURRENCY_CONFLICT = "CONCURRENCY_CONFLICT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 400,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCode.VALIDATION_ERROR, details?: unknown) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message: string = "Authentication required", code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    return new AppError(message, 401, code);
  }

  static forbidden(message: string = "Access denied", code: ErrorCode = ErrorCode.FORBIDDEN) {
    return new AppError(message, 403, code);
  }

  static notFound(message: string = "Resource not found", code: ErrorCode = ErrorCode.NOT_FOUND) {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code: ErrorCode = ErrorCode.CONCURRENCY_CONFLICT, details?: unknown) {
    return new AppError(message, 409, code, details);
  }

  static internal(message: string = "An unexpected error occurred", details?: unknown) {
    return new AppError(message, 500, ErrorCode.INTERNAL_ERROR, details);
  }
}

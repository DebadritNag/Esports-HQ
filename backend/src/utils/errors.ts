/**
 * Application error codes. Stable, machine-readable identifiers returned in the
 * error envelope so clients can branch on `error.code` rather than messages.
 */
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  UNSUPPORTED = 'UNSUPPORTED',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/** Default HTTP status for each error code. */
const DEFAULT_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.UNSUPPORTED]: 422,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

export interface AppErrorOptions {
  /** HTTP status override; defaults to the code's canonical status. */
  statusCode?: number;
  /** Non-secret structured detail surfaced to the client. */
  details?: unknown;
  /** Underlying cause (never serialized to clients). */
  cause?: unknown;
}

/**
 * Typed application error carrying a stable code + HTTP status. Thrown by
 * services and translated to the error envelope by the global error handler.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = options.statusCode ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }

  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError(ErrorCode.BAD_REQUEST, message, { details });
  }

  static unauthorized(message = 'Authentication required', details?: unknown): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, { details });
  }

  static forbidden(message = 'Access denied', details?: unknown): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, { details });
  }

  static notFound(message = 'Resource not found', details?: unknown): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, { details });
  }

  static conflict(message = 'Conflict', details?: unknown): AppError {
    return new AppError(ErrorCode.CONFLICT, message, { details });
  }

  static unsupported(message = 'Unsupported operation', details?: unknown): AppError {
    return new AppError(ErrorCode.UNSUPPORTED, message, { details });
  }

  static notImplemented(message = 'Not implemented', details?: unknown): AppError {
    return new AppError(ErrorCode.NOT_IMPLEMENTED, message, { details });
  }

  static serviceUnavailable(message = 'Service unavailable', details?: unknown): AppError {
    return new AppError(ErrorCode.SERVICE_UNAVAILABLE, message, { details });
  }

  static internal(message = 'Internal server error', cause?: unknown): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, { cause });
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

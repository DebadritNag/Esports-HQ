import { ZodError } from 'zod';
import { AppError, ErrorCode, isAppError } from './errors.js';

/** Shape of the standard error envelope returned by the API. */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface SerializeOptions {
  requestId: string;
  /** When true, hide internal messages/stacks/SQL from clients. */
  hideInternal?: boolean;
}

export interface SerializedError {
  statusCode: number;
  body: ErrorEnvelope;
}

/**
 * Translate any thrown value into a stable HTTP status + error envelope.
 * Never leaks stacks or driver/SQL details to clients in production.
 */
export function serializeError(error: unknown, options: SerializeOptions): SerializedError {
  const { requestId, hideInternal = false } = options;

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Request validation failed',
          requestId,
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
      },
    };
  }

  if (isAppError(error)) {
    const envelope: ErrorEnvelope = {
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    };
    if (error.details !== undefined) {
      envelope.error.details = error.details;
    }
    return { statusCode: error.statusCode, body: envelope };
  }

  // Fastify-style errors carrying a statusCode (e.g. rate-limit).
  if (isHttpError(error)) {
    const statusCode = error.statusCode;
    const code = statusCode === 429 ? ErrorCode.RATE_LIMITED : mapStatusToCode(statusCode);
    return {
      statusCode,
      body: {
        error: {
          code,
          message: hideInternal && statusCode >= 500 ? 'Internal server error' : error.message,
          requestId,
        },
      },
    };
  }

  // Unknown/unexpected error: hide details in production.
  const message =
    hideInternal === true
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : 'Internal server error';

  return {
    statusCode: 500,
    body: {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message,
        requestId,
      },
    },
  };
}

interface HttpLikeError {
  statusCode: number;
  message: string;
}

function isHttpError(value: unknown): value is HttpLikeError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof (value as { statusCode: unknown }).statusCode === 'number' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 422:
      return ErrorCode.UNSUPPORTED;
    case 429:
      return ErrorCode.RATE_LIMITED;
    case 501:
      return ErrorCode.NOT_IMPLEMENTED;
    case 503:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
  }
}

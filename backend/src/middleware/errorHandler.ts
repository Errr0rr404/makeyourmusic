import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PAYMENT = 'PAYMENT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL',
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  category: ErrorCategory;
  correlationId?: string;
  metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.INTERNAL,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.category = category;
    this.isOperational = statusCode < 500;
    this.metadata = metadata;
    Error.captureStackTrace(this, this.constructor);
  }
}

interface ErrorResponse {
  error: string;
  errorCode?: string;
  category?: ErrorCategory;
  requestId?: string;
  timestamp?: string;
  message?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

const getErrorCode = (statusCode: number, category: ErrorCategory): string => {
  const codeMap: Record<number, Partial<Record<ErrorCategory, string>>> = {
    400: { [ErrorCategory.VALIDATION]: 'INVALID_INPUT' },
    401: { [ErrorCategory.AUTHENTICATION]: 'AUTH_REQUIRED' },
    403: { [ErrorCategory.AUTHORIZATION]: 'FORBIDDEN' },
    404: { [ErrorCategory.NOT_FOUND]: 'RESOURCE_NOT_FOUND' },
    409: { [ErrorCategory.CONFLICT]: 'DUPLICATE_RESOURCE' },
    429: { [ErrorCategory.RATE_LIMIT]: 'TOO_MANY_REQUESTS' },
    502: { [ErrorCategory.EXTERNAL_SERVICE]: 'GATEWAY_ERROR' },
  };

  return codeMap[statusCode]?.[category] || `ERROR_${statusCode}`;
};

// Express recognizes error handlers via 4-arg arity (function.length === 4).
// _next is LOAD-BEARING — removing it silently disables error handling for
// the entire app. Don't drive-by edit it.
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Extract request metadata
  const requestId = (req as any).id || 'unknown';
  const correlationId = (req as any).correlationId || requestId;
  const errorMessage = err.message || 'Unknown error';
  const userId = (req as any).user?.userId;
  const userRole = (req as any).user?.role;

  let statusCode = 500;
  let category = ErrorCategory.INTERNAL;
  let errorCode = 'INTERNAL_ERROR';
  let metadata: Record<string, any> | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    category = err.category;
    errorCode = getErrorCode(statusCode, category);
    metadata = err.metadata;

    logger.warn('Operational error', {
      requestId,
      correlationId,
      userId,
      userRole,
      message: errorMessage,
      statusCode,
      category,
      errorCode,
      url: req.url,
      method: req.method,
      metadata,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    category = ErrorCategory.VALIDATION;
    errorCode = 'INVALID_JSON';

    logger.warn('Operational error', {
      requestId,
      correlationId,
      userId,
      userRole,
      message: 'Invalid JSON in request body',
      statusCode,
      category,
      errorCode,
      url: req.url,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else {
    // Unexpected error
    statusCode = 500;
    category = ErrorCategory.INTERNAL;
    errorCode = 'INTERNAL_ERROR';

    logger.error('Unexpected error', {
      requestId,
      correlationId,
      userId,
      userRole,
      message: errorMessage,
      url: req.url,
      method: req.method,
      stack: err.stack,
    });
  }

  // For unexpected 500s, never echo the raw error message to the client —
  // Prisma errors leak schema/column names + paths. Operational errors
  // (AppError) and JSON parse errors keep their messages because those are
  // intentionally human-friendly.
  const isOperational = err instanceof AppError || (err instanceof SyntaxError && 'body' in err);
  const clientMessage =
    isOperational || process.env.NODE_ENV === 'development'
      ? errorMessage
      : 'Internal server error';

  // Whitelist client-displayable metadata keys — `metadata` is a free-form
  // bag used for telemetry, but if a developer ever passes API credentials
  // or DB constraint details through it, the dev response branch would echo
  // them back to the client. Allow only known-safe keys.
  const SAFE_METADATA_KEYS = new Set([
    'field',
    'fields',
    'reason',
    'limit',
    'remaining',
    'retryAfter',
    'allowed',
    'expectedType',
    'received',
    'min',
    'max',
  ]);
  const safeMetadata = metadata
    ? Object.fromEntries(Object.entries(metadata).filter(([k]) => SAFE_METADATA_KEYS.has(k)))
    : undefined;

  const response: ErrorResponse = {
    error: clientMessage,
    errorCode,
    category,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      requestId,
      correlationId,
      message: errorMessage,
      stack: err.stack,
      metadata: safeMetadata,
    }),
  };

  res.status(statusCode).json(response);
};

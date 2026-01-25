import { NextRequest, NextResponse } from 'next/server';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleApiError = (error: unknown, req: NextRequest): NextResponse => {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  
  if (error instanceof AppError) {
    console.warn('Operational error', {
      requestId,
      message: error.message,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
    });

    return NextResponse.json(
      {
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { requestId }),
      },
      { status: error.statusCode }
    );
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  const errorName = error instanceof Error ? error.name : 'Unknown';

  // Enhanced error logging for debugging
  const errorLog: Record<string, unknown> = {
    requestId,
    name: errorName,
    message: errorMessage,
    url: req.url,
    method: req.method,
    stack: errorStack,
  };
  
  // Log the full error object if available
  if (error && typeof error === 'object') {
    try {
      errorLog.errorKeys = Object.keys(error);
      errorLog.errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch {
      // If JSON.stringify fails, just log the error message
      errorLog.errorString = String(error);
    }
  }
  
  console.error('Unexpected error', errorLog);

  // In production, never expose error details
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    {
      error: 'Internal server error',
      ...(isDevelopment && {
        message: errorMessage,
        name: errorName,
        stack: errorStack,
        requestId,
      }),
      ...(!isDevelopment && requestId && {
        requestId, // Include request ID for support tracking
      }),
    },
    { status: 500 }
  );
};

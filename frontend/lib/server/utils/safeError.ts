/**
 * Safe error message handler
 * Prevents information disclosure in production
 */

export const getSafeErrorMessage = (error: unknown, defaultMessage: string): string => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // In development, show detailed error messages
    if (error instanceof Error) {
      return error.message || defaultMessage;
    }
    return defaultMessage;
  }
  
  // In production, always return generic message
  return defaultMessage;
};

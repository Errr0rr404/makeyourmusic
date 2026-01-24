import { NextRequest } from 'next/server';

/**
 * Safely extract a string parameter from route params
 */
export const getStringParam = (params: Record<string, string | string[] | undefined>, key: string): string | undefined => {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

/**
 * Safely extract a string query parameter from Next.js request
 */
export const getStringQuery = (req: NextRequest, key: string): string | undefined => {
  const { searchParams } = new URL(req.url);
  const value = searchParams.get(key);
  return value || undefined;
};

/**
 * Safely extract a number query parameter
 */
export const getNumberQuery = (
  req: NextRequest,
  key: string,
  defaultValue?: number
): number | undefined => {
  const { searchParams } = new URL(req.url);
  const value = searchParams.get(key);
  if (value === null) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Safely extract a boolean query parameter
 */
export const getBooleanQuery = (req: NextRequest, key: string): boolean | undefined => {
  const { searchParams } = new URL(req.url);
  const value = searchParams.get(key);
  if (value === null) {
    return undefined;
  }
  return value === 'true';
};

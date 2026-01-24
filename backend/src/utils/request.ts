import { Request } from 'express';

/**
 * Safely extract a string parameter from request params
 */
export const getStringParam = (req: Request, key: string): string | undefined => {
  const value = req.params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

/**
 * Safely extract a string query parameter
 */
export const getStringQuery = (req: Request, key: string): string | undefined => {
  const value = req.query[key];
  if (Array.isArray(value)) {
    return value[0] as string;
  }
  return value as string | undefined;
};

/**
 * Safely extract a number query parameter
 */
export const getNumberQuery = (req: Request, key: string, defaultValue?: number): number | undefined => {
  const value = getStringQuery(req, key);
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

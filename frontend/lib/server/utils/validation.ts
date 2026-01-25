import validator from 'validator';
import { AppError } from './errorHandler';

// Password strength validation
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Sanitize string input
export const sanitizeString = (str: string | null | undefined): string | null => {
  if (str === null || str === undefined || str === '') {
    return null;
  }
  if (typeof str !== 'string') {
    return null;
  }
  return validator.escape(validator.trim(str));
};

// Sanitize email
export const sanitizeEmail = (email: string | null | undefined): string | null => {
  if (email === null || email === undefined || email === '') {
    return null;
  }
  if (typeof email !== 'string') {
    return null;
  }
  const normalized = validator.normalizeEmail(validator.trim(email));
  return normalized || null;
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

// Validate request body fields
export const validateRequestBody = (body: Record<string, unknown>, requiredFields: string[]): void => {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw new AppError(`${field} is required`, 400);
    }
  }
};

// Validation result type
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

// Validate price range
export const validatePriceRange = (
  minPrice?: number,
  maxPrice?: number
): ValidationResult => {
  if (minPrice !== undefined && minPrice < 0) {
    return { valid: false, message: 'Minimum price cannot be negative' };
  }
  
  if (maxPrice !== undefined && maxPrice < 0) {
    return { valid: false, message: 'Maximum price cannot be negative' };
  }
  
  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    minPrice > maxPrice
  ) {
    return { valid: false, message: 'Minimum price cannot be greater than maximum price' };
  }
  
  return { valid: true };
};

// Sanitize slug (lowercase, alphanumeric and hyphens only)
export const sanitizeSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

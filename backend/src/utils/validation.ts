/**
 * Centralized validation utilities
 */

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  return { valid: true };
};

/**
 * Validate non-empty string
 */
export const validateNonEmptyString = (
  value: string | undefined | null,
  fieldName: string = 'Field'
): ValidationResult => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  return { valid: true };
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (
  value: number | string | undefined | null,
  fieldName: string = 'Number'
): ValidationResult => {
  if (value === undefined || value === null) {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || num < 0) {
    return { valid: false, message: `${fieldName} must be a non-negative number` };
  }
  
  return { valid: true };
};

/**
 * Validate price range
 */
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

/**
 * Sanitize string input (trim and remove excessive whitespace)
 */
export const sanitizeString = (input: string | undefined | null): string | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  return input.trim().replace(/\s+/g, ' ');
};

/**
 * Sanitize slug (lowercase, alphanumeric and hyphens only)
 */
export const sanitizeSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
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

// Validate and sanitize middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Fields that should not be HTML-escaped (display text stored in DB, rendered safely by React)
const DISPLAY_TEXT_FIELDS = [
  'storeName', 'tagline', 'description', 'footerText',
  'heroTitle', 'heroSubtitle', 'heroButtonText', 'heroButton2Text',
  'featuredProductsTitle', 'featuredProductsSubtitle',
  'metaTitle', 'metaDescription', 'metaKeywords',
  'address', 'maintenanceMessage',
  // Store pickup address fields
  'name', 'line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone', 'hours',
  // Product fields that are display text
  'title', 'subtitle', 'content', 'note', 'message',
];

// Trim-only sanitization for display text (no HTML escaping)
const trimOnly = (str: string | null | undefined): string | null => {
  if (str === null || str === undefined || str === '') {
    return null;
  }
  if (typeof str !== 'string') {
    return null;
  }
  return str.trim();
};

// Sanitize request body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: any, parentKey?: string): any => {
      // Handle null/undefined
      if (obj === null || obj === undefined) {
        return obj;
      }
      // Handle strings
      if (typeof obj === 'string') {
        // For display text fields, only trim (no HTML escaping)
        if (parentKey && DISPLAY_TEXT_FIELDS.includes(parentKey)) {
          return trimOnly(obj);
        }
        // For other strings, use full sanitization
        return sanitizeString(obj);
      }
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item) => sanitize(item, parentKey));
      }
      // Handle objects
      if (obj && typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const key in obj) {
          // Skip password fields - don't sanitize them
          if (key === 'password') {
            sanitized[key] = obj[key];
          } 
          // Handle email specifically
          else if (key === 'email') {
            sanitized[key] = sanitizeEmail(obj[key] as string);
          }
          // Handle storePickupAddress and featuresJson objects specially
          else if (key === 'storePickupAddress' || key === 'featuresJson') {
            // Recursively sanitize nested object, passing parent key
            sanitized[key] = sanitize(obj[key], key);
          }
          // Recursively sanitize nested objects/arrays
          else {
            sanitized[key] = sanitize(obj[key], key);
          }
        }
        return sanitized;
      }
      return obj;
    };
    req.body = sanitize(req.body);
  }
  next();
};

// Common validation rules
export const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email address')
  .isLength({ max: 255 })
  .withMessage('Email must be less than 255 characters');

export const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

export const nameValidation = body('name')
  .optional()
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Name must be between 1 and 100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Name contains invalid characters');

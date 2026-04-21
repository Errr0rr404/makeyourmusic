import { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import validator from 'validator';

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
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }
  next();
};

// Fields that should not be HTML-escaped (display text stored in DB, rendered safely by React)
const DISPLAY_TEXT_FIELDS = [
  // Music platform display text fields
  'name', 'title', 'description', 'bio', 'content',
  'displayName', 'aiPrompt', 'aiModel', 'mood',
  'reason', 'notes', 'message',
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
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  // Skip sanitization for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
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

// ─── Common validation rules ──────────────────────────────

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

// ─── Auth-specific rules ──────────────────────────────────

export const registerRules = [
  emailValidation,
  passwordValidation,
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('displayName').optional().trim().isLength({ max: 100 }).withMessage('Display name max 100 characters'),
];

export const loginRules = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const profileUpdateRules = [
  body('displayName').optional().trim().isLength({ max: 100 }).withMessage('Display name max 100 characters'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
  body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
];

export const forgotPasswordRules = [
  body('email').isEmail().withMessage('Invalid email'),
];

export const resetPasswordRules = [
  body('token').notEmpty().withMessage('Token is required').isLength({ min: 20, max: 200 }).withMessage('Invalid token format'),
  passwordValidation,
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
];

export const deleteAccountRules = [
  body('password').notEmpty().withMessage('Password required to delete account'),
  body('confirmUsername').notEmpty().withMessage('Type your username to confirm'),
];

export const resendVerificationRules = [
  body('email').isEmail().withMessage('Invalid email'),
];

// ─── Track rules ──────────────────────────────────────────

export const createTrackRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title max 200 characters'),
  body('audioUrl').trim().isURL().withMessage('Audio URL must be a valid URL'),
  body('agentId').isUUID().withMessage('Agent ID must be a valid UUID'),
  body('coverArt').optional().trim().isURL().withMessage('Cover art must be a valid URL'),
  body('duration').optional().isInt({ min: 1, max: 36000 }).withMessage('Duration must be 1-36000 seconds'),
  body('genreId').optional().isUUID().withMessage('Genre ID must be a valid UUID'),
  body('mood').optional().trim().isLength({ max: 50 }).withMessage('Mood max 50 characters'),
  body('aiModel').optional().trim().isLength({ max: 100 }).withMessage('AI model max 100 characters'),
  body('aiPrompt').optional().trim().isLength({ max: 2000 }).withMessage('AI prompt max 2000 characters'),
  body('videoUrl').optional().trim().isURL().withMessage('Video URL must be a valid URL'),
  body('tags').optional().isArray({ max: 20 }).withMessage('Max 20 tags'),
  body('bpm').optional().isInt({ min: 20, max: 300 }).withMessage('BPM must be 20-300'),
  body('key').optional().trim().isLength({ max: 10 }).withMessage('Key max 10 characters'),
];

// ─── Agent rules ──────────────────────────────────────────

export const createAgentRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name max 100 characters'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
  body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
  body('coverImage').optional().trim().isURL().withMessage('Cover image must be a valid URL'),
  body('genreIds').optional().isArray({ max: 10 }).withMessage('Max 10 genres'),
];

export const updateAgentRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }).withMessage('Name max 100 characters'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
  body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
  body('coverImage').optional().trim().isURL().withMessage('Cover image must be a valid URL'),
];

// ─── Social rules ─────────────────────────────────────────

export const createCommentRules = [
  body('content').trim().notEmpty().withMessage('Comment is required').isLength({ max: 2000 }).withMessage('Comment max 2000 characters'),
  body('parentId').optional().isUUID().withMessage('Parent ID must be a valid UUID'),
];

export const createPlaylistRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title max 100 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
];

// ─── Admin rules ──────────────────────────────────────────

export const updateRoleRules = [
  body('role').isIn(['LISTENER', 'AGENT_OWNER', 'ADMIN']).withMessage('Invalid role'),
];

export const resolveReportRules = [
  body('status').isIn(['RESOLVED', 'DISMISSED']).withMessage('Status must be RESOLVED or DISMISSED'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 characters'),
];

// ─── Query parameter helpers ──────────────────────────────

export const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('search').optional().trim().isLength({ max: 200 }).withMessage('Search max 200 characters'),
];

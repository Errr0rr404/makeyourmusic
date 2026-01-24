/**
 * Enterprise-Grade Validation Utilities
 * Comprehensive input validation for all ERP operations
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

/**
 * Financial validators
 */
export const financialValidators = {
  /**
   * Validate decimal amount (10, 2) format
   * Prevents floating point errors
   */
  validateAmount: (value: any, fieldName: string, allowNegative = false): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED',
      });
      return errors;
    }

    const amount = Number(value);

    if (isNaN(amount)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid number`,
        code: 'INVALID_FORMAT',
        value,
      });
      return errors;
    }

    if (!allowNegative && amount < 0) {
      errors.push({
        field: fieldName,
        message: `${fieldName} cannot be negative`,
        code: 'NEGATIVE_VALUE',
        value: amount,
      });
    }

    // Check decimal places (max 2)
    if (amount % 0.01 !== 0) {
      errors.push({
        field: fieldName,
        message: `${fieldName} can have maximum 2 decimal places`,
        code: 'INVALID_DECIMALS',
        value: amount,
      });
    }

    // Check range (prevent overflow)
    if (Math.abs(amount) > 999999999.99) {
      errors.push({
        field: fieldName,
        message: `${fieldName} exceeds maximum allowed amount`,
        code: 'AMOUNT_OVERFLOW',
        value: amount,
      });
    }

    return errors;
  },

  /**
   * Validate percentage (0-100)
   */
  validatePercentage: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED',
      });
      return errors;
    }

    const percentage = Number(value);

    if (isNaN(percentage)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid number`,
        code: 'INVALID_FORMAT',
        value,
      });
      return errors;
    }

    if (percentage < 0 || percentage > 100) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be between 0 and 100`,
        code: 'OUT_OF_RANGE',
        value: percentage,
      });
    }

    return errors;
  },

  /**
   * Validate quantity (positive integer)
   */
  validateQuantity: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED',
      });
      return errors;
    }

    const qty = Number(value);

    if (!Number.isInteger(qty)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be an integer`,
        code: 'NOT_INTEGER',
        value,
      });
      return errors;
    }

    if (qty <= 0) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be greater than zero`,
        code: 'INVALID_QUANTITY',
        value: qty,
      });
    }

    if (qty > 999999) {
      errors.push({
        field: fieldName,
        message: `${fieldName} exceeds maximum allowed quantity`,
        code: 'QUANTITY_OVERFLOW',
        value: qty,
      });
    }

    return errors;
  },
};

/**
 * Text validators
 */
export const textValidators = {
  /**
   * Validate email format
   */
  validateEmail: (value: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED',
      });
      return errors;
    }

    const email = String(value).trim();

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email cannot be empty',
        code: 'EMPTY',
      });
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Email format is invalid',
        code: 'INVALID_FORMAT',
        value: email,
      });
    }

    if (email.length > 255) {
      errors.push({
        field: 'email',
        message: 'Email is too long (maximum 255 characters)',
        code: 'TOO_LONG',
        value: email,
      });
    }

    return errors;
  },

  /**
   * Validate string length
   */
  validateStringLength: (
    value: any,
    fieldName: string,
    minLength: number,
    maxLength: number
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      if (minLength > 0) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          code: 'REQUIRED',
        });
      }
      return errors;
    }

    const str = String(value);

    if (str.length < minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters`,
        code: 'TOO_SHORT',
        value: str,
      });
    }

    if (str.length > maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must not exceed ${maxLength} characters`,
        code: 'TOO_LONG',
        value: str,
      });
    }

    return errors;
  },

  /**
   * Validate alphanumeric string
   */
  validateAlphanumeric: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED',
      });
      return errors;
    }

    const str = String(value);
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;

    if (!alphanumericRegex.test(str)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} can only contain letters and numbers`,
        code: 'INVALID_FORMAT',
        value: str,
      });
    }

    return errors;
  },

  /**
   * Validate password strength
   */
  validatePassword: (value: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: 'password',
        message: 'Password is required',
        code: 'REQUIRED',
      });
      return errors;
    }

    const password = String(value);

    if (password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long',
        code: 'TOO_SHORT',
      });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'NO_UPPERCASE',
      });
    }

    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'NO_LOWERCASE',
      });
    }

    if (!/[0-9]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'NO_NUMBER',
      });
    }

    return errors;
  },

  /**
   * Validate phone number (international format)
   */
  validatePhone: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined || value === '') {
      return errors; // Phone is optional
    }

    const phone = String(value).replace(/\s/g, '');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!phoneRegex.test(phone)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} format is invalid`,
        code: 'INVALID_FORMAT',
        value,
      });
    }

    return errors;
  },

  /**
   * Validate URL format
   */
  validateUrl: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined || value === '') {
      return errors; // URL is optional
    }

    try {
      new URL(String(value));
    } catch (error) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is not a valid URL`,
        code: 'INVALID_URL',
        value,
      });
    }

    return errors;
  },
};

/**
 * Date validators
 */
export const dateValidators = {
  /**
   * Validate date format (YYYY-MM-DD or ISO)
   */
  validateDate: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED',
      });
      return errors;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is not a valid date`,
        code: 'INVALID_DATE',
        value,
      });
    }

    return errors;
  },

  /**
   * Validate date range
   */
  validateDateRange: (
    startDate: any,
    endDate: any,
    startFieldName: string,
    endFieldName: string
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      errors.push({
        field: startFieldName,
        message: `${startFieldName} is not a valid date`,
        code: 'INVALID_DATE',
        value: startDate,
      });
      return errors;
    }

    if (isNaN(end.getTime())) {
      errors.push({
        field: endFieldName,
        message: `${endFieldName} is not a valid date`,
        code: 'INVALID_DATE',
        value: endDate,
      });
      return errors;
    }

    if (end < start) {
      errors.push({
        field: endFieldName,
        message: `${endFieldName} must be after ${startFieldName}`,
        code: 'INVALID_RANGE',
        value: endDate,
      });
    }

    return errors;
  },

  /**
   * Validate date is in future
   */
  validateFutureDate: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    const date = new Date(value);
    const now = new Date();

    if (isNaN(date.getTime())) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is not a valid date`,
        code: 'INVALID_DATE',
        value,
      });
      return errors;
    }

    if (date <= now) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be in the future`,
        code: 'NOT_FUTURE',
        value,
      });
    }

    return errors;
  },

  /**
   * Validate date is in past
   */
  validatePastDate: (value: any, fieldName: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    const date = new Date(value);
    const now = new Date();

    if (isNaN(date.getTime())) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is not a valid date`,
        code: 'INVALID_DATE',
        value,
      });
      return errors;
    }

    if (date > now) {
      errors.push({
        field: fieldName,
        message: `${fieldName} cannot be in the future`,
        code: 'NOT_PAST',
        value,
      });
    }

    return errors;
  },
};

/**
 * Address validators
 */
export const addressValidators = {
  /**
   * Validate address object
   */
  validateAddress: (
    address: any,
    fieldName: string,
    required: boolean = true
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!address) {
      if (required) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          code: 'REQUIRED',
        });
      }
      return errors;
    }

    if (typeof address !== 'object') {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be an object`,
        code: 'INVALID_TYPE',
        value: address,
      });
      return errors;
    }

    const requiredFields = ['name', 'line1', 'city', 'state', 'postal_code', 'country'];

    for (const field of requiredFields) {
      if (!address[field] || typeof address[field] !== 'string' || !address[field].trim()) {
        errors.push({
          field: `${fieldName}.${field}`,
          message: `${field} is required`,
          code: 'REQUIRED',
        });
      }
    }

    return errors;
  },
};

/**
 * Composite validator
 */
export class Validator {
  private errors: ValidationError[] = [];

  /**
   * Add validation errors
   */
  addErrors(newErrors: ValidationError[]): this {
    this.errors.push(...newErrors);
    return this;
  }

  /**
   * Add single error
   */
  addError(field: string, message: string, code?: string, value?: any): this {
    this.errors.push({ field, message, code, value });
    return this;
  }

  /**
   * Get validation result
   */
  validate(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  /**
   * Throw error if validation failed
   */
  throwIfInvalid(): void {
    if (this.errors.length > 0) {
      const errorMessage = this.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');
      const error = new Error(errorMessage);
      (error as any).validationErrors = this.errors;
      throw error;
    }
  }
}

export default {
  financialValidators,
  textValidators,
  dateValidators,
  addressValidators,
  Validator,
};

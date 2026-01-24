import { z } from 'zod';

/**
 * Zod validation schemas for robust type-safe validation
 * These complement the existing validation in middleware/validation.ts
 */

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  avatar: z.string().url().optional(),
});

// Product validation schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().positive().optional(),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  categoryId: z.string().cuid().optional(),
  sku: z.string().max(50).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// Order validation schemas
export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().cuid(),
      quantity: z.number().int().positive(),
      variantId: z.string().cuid().optional(),
      specialInstructions: z.string().max(500).optional(),
    })
  ).min(1, 'At least one item is required'),
  deliveryMethod: z.enum(['DELIVERY', 'PICKUP']),
  paymentTiming: z.enum(['PAY_NOW', 'PAY_AT_STORE']),
  paymentMethod: z.enum([
    'STRIPE',
    'PAYPAL',
    'APPLE_PAY',
    'GOOGLE_PAY',
    'AMAZON_PAY',
    'BKASH',
    'NAGAD',
    'ROCKET',
    'BITCOIN',
    'ETHEREUM',
    'CASH',
    'MANUAL_CREDIT_CARD',
  ]),
  shippingAddress: z
    .object({
      name: z.string().min(1),
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().min(1),
      phone: z.string().optional(),
    })
    .optional(),
  billingAddress: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
  }),
  notes: z.string().max(1000).optional(),
  tipAmount: z.number().nonnegative().optional(),
  scheduledFor: z.string().datetime().optional(),
});

// Cart validation schemas
export const addToCartSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().max(100),
  variantId: z.string().cuid().optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(100),
});

// Review validation schemas
export const createReviewSchema = z.object({
  productId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  comment: z.string().max(2000).optional(),
});

// Promo code validation schemas
export const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  discountValue: z.number().positive(),
  minimumOrderValue: z.number().nonnegative().optional(),
  maxUsageCount: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// POS validation schemas
export const createPosOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().cuid(),
      quantity: z.number().int().positive(),
      variantId: z.string().cuid().optional(),
      specialInstructions: z.string().max(500).optional(),
    })
  ).min(1),
  paymentMethod: z.enum([
    'CASH',
    'MANUAL_CREDIT_CARD',
    'STRIPE',
    'PAYPAL',
    'APPLE_PAY',
    'GOOGLE_PAY',
  ]),
  tipAmount: z.number().nonnegative().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

// ERP validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  clientName: z.string().max(200).optional(),
  budget: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  assignedTo: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedHours: z.number().positive().optional(),
});

// Workflow validation schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  triggerType: z.enum(['MANUAL', 'SCHEDULED', 'EVENT', 'WEBHOOK', 'API']),
  triggerConfig: z.record(z.string(), z.any()),
  steps: z.array(z.any()).min(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

/**
 * Validate request body against schema
 */
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

/**
 * Safe validate - returns error instead of throwing
 */
export const safeValidateRequest = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
};

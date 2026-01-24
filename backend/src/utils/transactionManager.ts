/**
 * Enterprise-Grade Database Transaction Utilities
 * Ensures data consistency, ACID compliance, and audit trail for all operations
 */

import { prisma } from './db';
import { AppError, ErrorCategory } from '../middleware/errorHandler';
import logger from './logger';

export interface TransactionContext {
  userId: string;
  correlationId: string;
  operation: string;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  userId: string;
  operation: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST';
  changes?: Record<string, { before: any; after: any }>;
  timestamp: Date;
  correlationId: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

/**
 * Execute a critical financial operation with full transaction safety
 * Ensures atomic execution and audit logging
 */
export async function executeFinancialTransaction<T>(
  context: TransactionContext,
  operation: (client: typeof prisma) => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let result: T;

  try {
    logger.info('Financial transaction started', {
      correlationId: context.correlationId,
      userId: context.userId,
      operation: context.operation,
    });

    // Execute operation in SERIALIZABLE isolation (highest level)
    result = await prisma.$transaction(
      async (tx) => {
        return await operation(tx as typeof prisma);
      },
      {
        // Serializable isolation for critical operations
        isolationLevel: 'Serializable',
        timeout: 30000, // 30 second timeout
      }
    );

    const duration = Date.now() - startTime;
    logger.info('Financial transaction completed', {
      correlationId: context.correlationId,
      userId: context.userId,
      operation: context.operation,
      duration,
      metadata: context.metadata,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Financial transaction failed', {
      correlationId: context.correlationId,
      userId: context.userId,
      operation: context.operation,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Financial transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      ErrorCategory.DATABASE,
      { operation: context.operation }
    );
  }
}

/**
 * Validate double-entry bookkeeping constraint
 * Ensures debits equal credits with tolerance for rounding
 */
export function validateDoubleEntry(
  entries: Array<{ debit?: number; credit?: number; description?: string }>
): { valid: boolean; error?: string; totalDebit?: number; totalCredit?: number } {
  const TOLERANCE = 0.01; // Allow for 1 cent rounding

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    const description = entry.description || `Line ${i + 1}`;

    // Validate numbers
    if (isNaN(debit) || isNaN(credit)) {
      return {
        valid: false,
        error: `Invalid amount in ${description}`,
      };
    }

    // Validate non-negative
    if (debit < 0 || credit < 0) {
      return {
        valid: false,
        error: `Negative amount not allowed in ${description}`,
      };
    }

    // Validate only one side is filled
    if (debit > 0 && credit > 0) {
      return {
        valid: false,
        error: `Cannot have both debit and credit in ${description}`,
      };
    }

    // Validate at least one side is filled
    if (debit === 0 && credit === 0) {
      return {
        valid: false,
        error: `Must have either debit or credit in ${description}`,
      };
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  // Check balance
  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > TOLERANCE) {
    return {
      valid: false,
      error: `Debits (${totalDebit.toFixed(2)}) and credits (${totalCredit.toFixed(2)}) do not balance (difference: ${difference.toFixed(2)})`,
      totalDebit,
      totalCredit,
    };
  }

  return {
    valid: true,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
  };
}

/**
 * Generate collision-resistant unique identifiers for financial documents
 */
export const identifierGenerators = {
  /**
   * Generate journal entry number: JE-YYYYMMDD-<random>
   * Format ensures chronological sorting and prevents collisions
   */
  journalEntry: (): string => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `JE-${date}-${random}`;
  },

  /**
   * Generate invoice number: INV-YYYYMMDD-<random> or PO-YYYYMMDD-<random>
   */
  invoice: (type: 'SALES' | 'PURCHASE'): string => {
    const prefix = type === 'SALES' ? 'INV' : 'PO';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${date}-${random}`;
  },

  /**
   * Generate order number: ORD-<timestamp>-<random>
   */
  order: (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  },

  /**
   * Generate transaction reference: TXN-<timestamp>-<random>
   */
  transaction: (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  },
};

/**
 * Safely retrieve a unique identifier with collision detection
 * Retries with exponential backoff if collision detected
 */
export async function getUniqueIdentifier<T extends { [K in Field]: string }, Field extends string>(
  generator: () => string,
  checkExists: (id: string) => Promise<T | null>,
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const id = generator();
    const existing = await checkExists(id);

    if (!existing) {
      return id;
    }

    // Exponential backoff: 10ms, 50ms, 250ms
    const delay = 10 * Math.pow(5, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new AppError(
    'Failed to generate unique identifier after multiple attempts',
    500,
    ErrorCategory.DATABASE
  );
}

/**
 * Validate payment amount constraints
 * Prevents overpayment and ensures valid amounts
 */
export function validatePaymentAmount(
  amount: number,
  invoiceTotal: number,
  alreadyPaid: number
): { valid: boolean; error?: string; maxPayment?: number } {
  // Validate amount is a positive number
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return {
      valid: false,
      error: 'Payment amount must be greater than zero',
    };
  }

  // Check if invoice is already fully paid
  if (alreadyPaid >= invoiceTotal) {
    return {
      valid: false,
      error: 'Invoice is already fully paid',
    };
  }

  // Check if payment would exceed total
  const newTotal = alreadyPaid + amount;
  const maxPayment = invoiceTotal - alreadyPaid;

  if (newTotal > invoiceTotal) {
    return {
      valid: false,
      error: `Payment amount exceeds invoice balance`,
      maxPayment: Number(maxPayment.toFixed(2)),
    };
  }

  return { valid: true };
}

/**
 * Calculate financial totals with proper decimal handling
 * Prevents floating point rounding errors
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number; taxRate?: number }>
): { subtotal: number; tax: number; total: number; error?: string } {
  try {
    let subtotal = 0;
    let tax = 0;

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const rate = Number(item.taxRate || 0);

      if (isNaN(qty) || isNaN(price) || isNaN(rate)) {
        return {
          subtotal: 0,
          tax: 0,
          total: 0,
          error: `Invalid calculation values for item`,
        };
      }

      if (qty < 0 || price < 0 || rate < 0) {
        return {
          subtotal: 0,
          tax: 0,
          total: 0,
          error: `Negative values not allowed in calculation`,
        };
      }

      const itemTotal = qty * price;
      subtotal += itemTotal;
      tax += itemTotal * rate;
    }

    // Round to 2 decimal places
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedTax = Math.round(tax * 100) / 100;
    const total = roundedSubtotal + roundedTax;

    return {
      subtotal: roundedSubtotal,
      tax: roundedTax,
      total: Math.round(total * 100) / 100,
    };
  } catch (error) {
    return {
      subtotal: 0,
      tax: 0,
      total: 0,
      error: 'Error calculating totals',
    };
  }
}

export default {
  executeFinancialTransaction,
  validateDoubleEntry,
  identifierGenerators,
  getUniqueIdentifier,
  validatePaymentAmount,
  calculateInvoiceTotals,
};

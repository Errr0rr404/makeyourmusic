// Lightweight Decimal placeholder to avoid importing Prisma runtime internals in build
type Decimal = any;

// Payment type definition
interface PaymentData {
  id: string;
  orderId: string;
  paymentMethod?: string;
  gatewayTransactionId?: string | null;
  stripePaymentIntentId?: string | null;
  paypalOrderId?: string | null;
  bkashTransactionId?: string | null;
  nagadTransactionId?: string | null;
  rocketTransactionId?: string | null;
  amount: Decimal | number | string;
  currency: string;
  status: string;
  gatewayResponse?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to work with Prisma types that may not be fully generated yet
export const castPayment = (payment: unknown): PaymentData => {
  return payment as PaymentData;
};

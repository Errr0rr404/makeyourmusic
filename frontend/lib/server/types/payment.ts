// Copy from backend/src/types/payment.ts
export type PaymentMethod =
  | 'STRIPE'
  | 'PAYPAL'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'AMAZON_PAY'
  | 'BKASH'
  | 'NAGAD'
  | 'ROCKET'
  | 'BITCOIN'
  | 'ETHEREUM'
  | 'MANUAL_CREDIT_CARD';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  paymentMethod: PaymentMethod;
  clientSecret?: string;
  redirectUrl?: string;
}

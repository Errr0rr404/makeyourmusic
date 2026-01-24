import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export interface PaymentGatewayConfig {
  enabled: boolean;
  credentials: Record<string, string>;
}

export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  qrCode?: string;
  phoneNumber?: string;
  instructions?: string;
  error?: string;
}

export interface PaymentVerificationRequest {
  transactionId: string;
  orderId: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: PaymentStatus;
  transactionId: string;
  amount?: number;
  error?: string;
}

export abstract class PaymentGateway {
  abstract method: PaymentMethod;
  abstract name: string;
  abstract icon: string;
  abstract supportedCountries: string[];
  
  protected config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  abstract createPayment(request: CreatePaymentRequest): Promise<PaymentResponse>;
  abstract verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse>;
  abstract handleWebhook(payload: any, headers: any): Promise<PaymentVerificationResponse>;

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isSupported(country?: string): boolean {
    if (!this.supportedCountries.length) return true; // Global support
    if (!country) return true;
    return this.supportedCountries.includes(country.toUpperCase());
  }
}

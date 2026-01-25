import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class ManualCreditCardGateway extends PaymentGateway {
  method = PaymentMethod.MANUAL_CREDIT_CARD;
  name = 'Manual Credit Card';
  icon = '💳';
  supportedCountries = []; // Global support

  constructor(config: any) {
    super(config);
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      // Manual credit card entry - payment details are collected and processed manually by admin
      // This creates a pending payment that requires manual processing
      return {
        success: true,
        transactionId: `MANUAL-CC-${request.orderId}-${Date.now()}`,
        instructions: `Please enter your credit card details. An admin will process this payment manually. Order ID: ${request.orderId}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create manual credit card payment',
      };
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      // Manual verification - admins must manually update payment status
      // This gateway always returns pending until manually updated by admin
      return {
        success: true,
        status: PaymentStatus.PENDING,
        transactionId: request.transactionId,
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: error.message || 'Failed to verify manual credit card payment',
      };
    }
  }

  async handleWebhook(payload: any, _headers: any): Promise<PaymentVerificationResponse> {
    // Manual credit card doesn't have webhooks - admins process manually
    return {
      success: false,
      status: PaymentStatus.PENDING,
      transactionId: payload.transactionId || '',
      error: 'Manual credit card payments require manual processing by admin',
    };
  }
}

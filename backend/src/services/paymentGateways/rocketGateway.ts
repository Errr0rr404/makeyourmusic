import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class RocketGateway extends PaymentGateway {
  method = PaymentMethod.ROCKET;
  name = 'Rocket';
  icon = '🚀';
  supportedCountries = ['BD']; // Bangladesh only

  private merchantId: string;
  private merchantKey: string;
  private baseUrl: string;

  constructor(config: any) {
    super(config);
    this.merchantId = config.credentials.ROCKET_MERCHANT_ID || '';
    this.merchantKey = config.credentials.ROCKET_MERCHANT_KEY || '';
    this.baseUrl = config.credentials.ROCKET_MODE === 'live'
      ? 'https://www.rocket.com.bd'
      : 'https://sandbox.rocket.com.bd';
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      // Rocket typically uses manual payment or API integration
      // For now, we'll provide instructions for manual payment
      // In production, you'd integrate with Rocket's merchant API
      
      const merchantNumber = this.merchantKey || this.merchantId;
      
      return {
        success: true,
        transactionId: `ROCKET-${request.orderId}-${Date.now()}`,
        phoneNumber: merchantNumber,
        instructions: `Please send BDT ${request.amount.toFixed(2)} to Rocket number: ${merchantNumber}. Use Order ID: ${request.orderId} as reference.`,
        qrCode: `${this.baseUrl}/qr/${request.orderId}`, // Example QR code URL
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Rocket payment',
      };
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      // In production, verify with Rocket API
      // For now, return pending status (manual verification needed)
      return {
        success: false,
        status: PaymentStatus.PENDING,
        transactionId: request.transactionId,
        error: 'Manual verification required. Please contact support with your transaction details.',
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: error.message || 'Failed to verify Rocket payment',
      };
    }
  }

  async handleWebhook(payload: any, _headers: any): Promise<PaymentVerificationResponse> {
    // Rocket webhook handling would go here
    return {
      success: false,
      status: PaymentStatus.PENDING,
      transactionId: payload.transactionId || '',
    };
  }
}

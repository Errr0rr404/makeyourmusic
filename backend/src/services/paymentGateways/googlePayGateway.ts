import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';
import Stripe from 'stripe';

export class GooglePayGateway extends PaymentGateway {
  method = PaymentMethod.GOOGLE_PAY;
  name = 'Google Pay';
  icon = 'G';
  supportedCountries: string[] = []; // Global support (where Google Pay is available)

  private stripe: Stripe;

  constructor(config: any) {
    super(config);
    // Google Pay is processed through Stripe
    const apiKey = config.credentials.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('Stripe API key is required for Google Pay but not provided');
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const amountInCents = Math.round(request.amount * 100);
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: request.currency.toLowerCase(),
        metadata: {
          orderId: request.orderId,
          paymentMethod: 'google_pay',
          ...request.metadata,
        },
        payment_method_types: ['card'],
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Google Pay payment',
      };
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(request.transactionId);

      let status: PaymentStatus = PaymentStatus.PENDING;
      if (paymentIntent.status === 'succeeded') {
        status = PaymentStatus.SUCCEEDED;
      } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
        status = PaymentStatus.FAILED;
      }

      return {
        success: paymentIntent.status === 'succeeded',
        status,
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: error.message || 'Failed to verify Google Pay payment',
      };
    }
  }

  async handleWebhook(payload: any, headers: any): Promise<PaymentVerificationResponse> {
    // Handled by Stripe webhook
    return {
      success: false,
      status: PaymentStatus.PENDING,
      transactionId: '',
    };
  }
}

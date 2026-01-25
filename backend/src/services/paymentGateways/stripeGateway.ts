import Stripe from 'stripe';
import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class StripeGateway extends PaymentGateway {
  method = PaymentMethod.STRIPE;
  name = 'Credit/Debit Card';
  icon = '💳';
  supportedCountries: string[] = []; // Global support

  private stripe: Stripe;

  constructor(config: any) {
    super(config);
    const apiKey = config.credentials.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('Stripe API key is required but not provided');
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const amountInCents = Math.round(request.amount * 100);
      
      if (amountInCents < 50) {
        return {
          success: false,
          error: 'Amount too small (minimum $0.50)',
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: request.currency.toLowerCase(),
        metadata: {
          orderId: request.orderId,
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
        error: error.message || 'Failed to create payment',
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
      } else if (paymentIntent.status === 'processing') {
        status = PaymentStatus.PROCESSING;
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
        error: error.message || 'Failed to verify payment',
      };
    }
  }

  async handleWebhook(payload: any, headers: any): Promise<PaymentVerificationResponse> {
    const sig = headers['stripe-signature'];
    const webhookSecret = this.config.credentials.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: '',
        error: 'Webhook secret not configured',
      };
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      let status: PaymentStatus = PaymentStatus.PENDING;
      if (event.type === 'payment_intent.succeeded') {
        status = PaymentStatus.SUCCEEDED;
      } else if (event.type === 'payment_intent.payment_failed') {
        status = PaymentStatus.FAILED;
      }

      return {
        success: status === PaymentStatus.SUCCEEDED,
        status,
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: '',
        error: error.message || 'Webhook verification failed',
      };
    }
  }
}

import Stripe from 'stripe';
import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class StripeTerminalGateway extends PaymentGateway {
  method = PaymentMethod.STRIPE; // Uses same method as regular Stripe
  name = 'Card Reader (Chip/Tap)';
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

  /**
   * Create a connection token for Stripe Terminal
   * This is used by the frontend to connect to the card reader
   */
  async createConnectionToken(): Promise<{ secret: string }> {
    try {
      const connectionToken = await this.stripe.terminal.connectionTokens.create();
      return { secret: connectionToken.secret };
    } catch (error: any) {
      throw new Error(`Failed to create connection token: ${error.message}`);
    }
  }

  /**
   * Create a payment intent for Terminal
   * This is different from regular Stripe - it's optimized for in-person payments
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const amountInCents = Math.round(request.amount * 100);
      
      if (amountInCents < 50) {
        return {
          success: false,
          error: 'Amount too small (minimum $0.50)',
        };
      }

      // Create payment intent with Terminal-specific configuration
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: request.currency.toLowerCase(),
        metadata: {
          orderId: request.orderId,
          paymentType: 'terminal',
          ...request.metadata,
        },
        payment_method_types: ['card_present'],
        capture_method: 'automatic', // Auto-capture for POS
        // Terminal-specific: on_behalf_of and transfer_data can be used for marketplace scenarios
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Terminal payment',
      };
    }
  }

  /**
   * Process payment with Terminal
   * This creates a payment intent and returns it for the frontend to process
   */
  async processTerminalPayment(request: CreatePaymentRequest & { readerId?: string }): Promise<PaymentResponse> {
    try {
      // First create the payment intent
      const paymentResponse = await this.createPayment(request);
      
      if (!paymentResponse.success || !paymentResponse.clientSecret) {
        return paymentResponse;
      }

      // If readerId is provided, we can collect payment directly
      // Otherwise, frontend will handle the collection
      return paymentResponse;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process Terminal payment',
      };
    }
  }

  /**
   * Verify payment status
   */
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

  /**
   * Handle webhook events from Stripe Terminal
   */
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
      } else if (event.type === 'terminal.reader.action_succeeded') {
        // Terminal-specific event
        status = PaymentStatus.SUCCEEDED;
      } else if (event.type === 'terminal.reader.action_failed') {
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

  /**
   * List available Terminal readers
   */
  async listReaders(): Promise<Stripe.Terminal.Reader[]> {
    try {
      const readers = await this.stripe.terminal.readers.list({
        limit: 100,
      });
      return readers.data;
    } catch (error: any) {
      throw new Error(`Failed to list readers: ${error.message}`);
    }
  }
}

import axios from 'axios';
import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class BkashGateway extends PaymentGateway {
  method = PaymentMethod.BKASH;
  name = 'bKash';
  icon = '📱';
  supportedCountries = ['BD']; // Bangladesh only

  private appKey: string;
  private appSecret: string;
  private username: string;
  private password: string;
  private baseUrl: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: any) {
    super(config);
    this.appKey = config.credentials.BKASH_APP_KEY || '';
    this.appSecret = config.credentials.BKASH_APP_SECRET || '';
    this.username = config.credentials.BKASH_USERNAME || '';
    this.password = config.credentials.BKASH_PASSWORD || '';
    this.baseUrl = config.credentials.BKASH_MODE === 'live'
      ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
      : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.length > 0 && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/token/grant`,
        {
          app_key: this.appKey,
          app_secret: this.appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            username: this.username,
            password: this.password,
          },
        }
      );

      this.accessToken = response.data.id_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
      return this.accessToken;
    } catch (error: any) {
      throw new Error(`bKash authentication failed: ${error.message}`);
    }
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const paymentData = {
        mode: '0011', // Checkout
        payerReference: request.orderId,
        callbackURL: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payments/bkash/callback`,
        amount: request.amount.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: request.orderId,
      };

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/payment/create`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: accessToken,
            'X-App-Key': this.appKey,
          },
        }
      );

      if (response.data.statusCode === '0000') {
        return {
          success: true,
          transactionId: response.data.paymentID,
          redirectUrl: response.data.bkashURL,
        };
      }

      return {
        success: false,
        error: response.data.statusMessage || 'Failed to create bKash payment',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.statusMessage || error.message || 'Failed to create bKash payment',
      };
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/payment/query`,
        {
          paymentID: request.transactionId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: accessToken,
            'X-App-Key': this.appKey,
          },
        }
      );

      if (response.data.statusCode === '0000') {
        const transactionStatus = response.data.transactionStatus;
        let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

        if (transactionStatus === 'Completed') {
          paymentStatus = PaymentStatus.SUCCEEDED;
        } else if (transactionStatus === 'Failed' || transactionStatus === 'Cancelled') {
          paymentStatus = PaymentStatus.FAILED;
        }

        return {
          success: paymentStatus === PaymentStatus.SUCCEEDED,
          status: paymentStatus,
          transactionId: response.data.paymentID,
          amount: parseFloat(response.data.amount || '0'),
        };
      }

      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: response.data.statusMessage || 'Payment verification failed',
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: error.message || 'Failed to verify bKash payment',
      };
    }
  }

  async handleWebhook(payload: any, _headers: any): Promise<PaymentVerificationResponse> {
    // bKash sends payment status in callback
    if (payload.status === 'success' && payload.paymentID) {
      return this.verifyPayment({
        transactionId: payload.paymentID,
        orderId: payload.merchantInvoiceNumber || '',
      });
    }

    return {
      success: false,
      status: PaymentStatus.FAILED,
      transactionId: payload.paymentID || '',
      error: 'Invalid webhook payload',
    };
  }
}

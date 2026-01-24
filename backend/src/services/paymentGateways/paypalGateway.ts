import axios from 'axios';
import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class PayPalGateway extends PaymentGateway {
  method = PaymentMethod.PAYPAL;
  name = 'PayPal';
  icon = '🅿️';
  supportedCountries: string[] = []; // Global support

  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: any) {
    super(config);
    this.clientId = config.credentials.PAYPAL_CLIENT_ID || '';
    this.clientSecret = config.credentials.PAYPAL_CLIENT_SECRET || '';
    this.baseUrl = config.credentials.PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.length > 0 && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
      return this.accessToken;
    } catch (error: any) {
      throw new Error(`PayPal authentication failed: ${error.message}`);
    }
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: request.orderId,
            amount: {
              currency_code: request.currency.toUpperCase(),
              value: request.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: request.returnUrl || `${process.env.FRONTEND_URL}/checkout/success`,
          cancel_url: request.cancelUrl || `${process.env.FRONTEND_URL}/checkout`,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const approvalUrl = response.data.links.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      return {
        success: true,
        transactionId: response.data.id,
        redirectUrl: approvalUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create PayPal payment',
      };
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${request.transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const status = response.data.status;
      let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

      if (status === 'COMPLETED') {
        paymentStatus = PaymentStatus.SUCCEEDED;
      } else if (status === 'CANCELLED' || status === 'VOIDED') {
        paymentStatus = PaymentStatus.FAILED;
      }

      const amount = parseFloat(
        response.data.purchase_units[0]?.amount?.value || '0'
      );

      return {
        success: paymentStatus === PaymentStatus.SUCCEEDED,
        status: paymentStatus,
        transactionId: response.data.id,
        amount,
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: error.response?.data?.message || error.message || 'Failed to verify PayPal payment',
      };
    }
  }

  async capturePayment(orderId: string): Promise<PaymentVerificationResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const status = response.data.status;
      let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

      if (status === 'COMPLETED') {
        paymentStatus = PaymentStatus.SUCCEEDED;
      }

      const amount = parseFloat(
        response.data.purchase_units[0]?.payments?.captures[0]?.amount?.value || '0'
      );

      return {
        success: paymentStatus === PaymentStatus.SUCCEEDED,
        status: paymentStatus,
        transactionId: response.data.id,
        amount,
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: orderId,
        error: error.response?.data?.message || error.message || 'Failed to capture PayPal payment',
      };
    }
  }

  async handleWebhook(payload: any, headers: any): Promise<PaymentVerificationResponse> {
    // PayPal webhook verification would go here
    // For now, return verification based on event type
    const eventType = payload.event_type;
    const resource = payload.resource;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      return {
        success: true,
        status: PaymentStatus.SUCCEEDED,
        transactionId: resource.id,
        amount: parseFloat(resource.amount.value || '0'),
      };
    }

    return {
      success: false,
      status: PaymentStatus.PENDING,
      transactionId: resource?.id || '',
    };
  }
}

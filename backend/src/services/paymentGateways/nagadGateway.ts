import axios from 'axios';
import crypto from 'crypto';
import { PaymentGateway, CreatePaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse } from './base';
import { PaymentStatus } from '../../types';
import { PaymentMethod } from '../../types/payment';

export class NagadGateway extends PaymentGateway {
  method = PaymentMethod.NAGAD;
  name = 'Nagad';
  icon = '💳';
  supportedCountries = ['BD']; // Bangladesh only

  private merchantId: string;
  private merchantNumber: string;
  private publicKey: string;
  private privateKey: string;
  private baseUrl: string;

  constructor(config: any) {
    super(config);
    this.merchantId = config.credentials.NAGAD_MERCHANT_ID || '';
    this.merchantNumber = config.credentials.NAGAD_MERCHANT_NUMBER || '';
    this.publicKey = config.credentials.NAGAD_PUBLIC_KEY || '';
    this.privateKey = config.credentials.NAGAD_PRIVATE_KEY || '';
    this.baseUrl = config.credentials.NAGAD_MODE === 'live'
      ? 'https://api.mynagad.com'
      : 'https://sandbox.mynagad.com';
  }

  private generateSignature(data: string): string {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const datetime = new Date().toISOString();
      const merchantCallbackURL = `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payments/nagad/callback`;
      
      const paymentData = {
        merchantId: this.merchantId,
        orderId: request.orderId,
        datetime: datetime,
        challenge: crypto.randomBytes(16).toString('hex'),
        amount: request.amount.toFixed(2),
        currencyCode: '050', // BDT
        additionalMerchantInfo: {},
      };

      const dataString = JSON.stringify(paymentData);
      const signature = this.generateSignature(dataString);

      const response = await axios.post(
        `${this.baseUrl}/api/dfs/check-out/initialize/${this.merchantId}/${request.orderId}`,
        {
          ...paymentData,
          signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // Note: Nagad API requires X-KM-IP-V4 header (client IP recommended in production)
            // For production, use actual client IP from request headers
            'X-KM-IP-V4': process.env.NAGAD_CLIENT_IP || '127.0.0.1',
            'X-KM-Client-Type': 'PC_WEB',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-Request-Type': 'JSON',
          },
        }
      );

      if (response.data.reasonCode === '0000') {
        return {
          success: true,
          transactionId: response.data.paymentReferenceId,
          redirectUrl: response.data.callBackUrl,
        };
      }

      return {
        success: false,
        error: response.data.reason || 'Failed to create Nagad payment',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.reason || error.message || 'Failed to create Nagad payment',
      };
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/dfs/verify/payment/${this.merchantId}/${request.transactionId}`,
        {
          headers: {
            // Note: Nagad API requires X-KM-IP-V4 header (client IP recommended in production)
            'X-KM-IP-V4': process.env.NAGAD_CLIENT_IP || '127.0.0.1',
            'X-KM-Client-Type': 'PC_WEB',
            'X-KM-Api-Version': 'v-0.2.0',
          },
        }
      );

      if (response.data.reasonCode === '0000') {
        const status = response.data.statusCode;
        let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

        if (status === 'Success') {
          paymentStatus = PaymentStatus.SUCCEEDED;
        } else if (status === 'Failed') {
          paymentStatus = PaymentStatus.FAILED;
        }

        return {
          success: paymentStatus === PaymentStatus.SUCCEEDED,
          status: paymentStatus,
          transactionId: response.data.paymentReferenceId,
          amount: parseFloat(response.data.amount || '0'),
        };
      }

      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: response.data.reason || 'Payment verification failed',
      };
    } catch (error: any) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionId: request.transactionId,
        error: error.message || 'Failed to verify Nagad payment',
      };
    }
  }

  async handleWebhook(payload: any, headers: any): Promise<PaymentVerificationResponse> {
    if (payload.statusCode === 'Success' && payload.paymentReferenceId) {
      return {
        success: true,
        status: PaymentStatus.SUCCEEDED,
        transactionId: payload.paymentReferenceId,
        amount: parseFloat(payload.amount || '0'),
      };
    }

    return {
      success: false,
      status: PaymentStatus.FAILED,
      transactionId: payload.paymentReferenceId || '',
      error: 'Invalid webhook payload',
    };
  }
}

import { PaymentGateway, PaymentGatewayConfig } from './base';
import { StripeGateway } from './stripeGateway';
import { PayPalGateway } from './paypalGateway';
import { BkashGateway } from './bkashGateway';
import { NagadGateway } from './nagadGateway';
import { RocketGateway } from './rocketGateway';
import { ApplePayGateway } from './applePayGateway';
import { GooglePayGateway } from './googlePayGateway';
import { AmazonPayGateway } from './amazonPayGateway';
import { BitcoinGateway } from './bitcoinGateway';
import { EthereumGateway } from './ethereumGateway';
import { ManualCreditCardGateway } from './manualCreditCardGateway';
import { PaymentMethod } from '../../types/payment';

export class PaymentGatewayManager {
  private gateways: Map<PaymentMethod, PaymentGateway> = new Map();

  constructor() {
    // Initialize all payment gateways
    const config = this.getGatewayConfig();

    // Stripe (supports card, Apple Pay, Google Pay)
    if (config.STRIPE?.enabled) {
      this.gateways.set(PaymentMethod.STRIPE, new StripeGateway(config.STRIPE));
      this.gateways.set(PaymentMethod.APPLE_PAY, new ApplePayGateway(config.STRIPE));
      this.gateways.set(PaymentMethod.GOOGLE_PAY, new GooglePayGateway(config.STRIPE));
    }

    // PayPal
    if (config.PAYPAL?.enabled) {
      this.gateways.set(PaymentMethod.PAYPAL, new PayPalGateway(config.PAYPAL));
    }

    // Amazon Pay
    if (config.AMAZON_PAY?.enabled) {
      this.gateways.set(PaymentMethod.AMAZON_PAY, new AmazonPayGateway(config.AMAZON_PAY));
    }

    // Bangladesh Payment Methods
    if (config.BKASH?.enabled) {
      this.gateways.set(PaymentMethod.BKASH, new BkashGateway(config.BKASH));
    }

    if (config.NAGAD?.enabled) {
      this.gateways.set(PaymentMethod.NAGAD, new NagadGateway(config.NAGAD));
    }

    if (config.ROCKET?.enabled) {
      this.gateways.set(PaymentMethod.ROCKET, new RocketGateway(config.ROCKET));
    }

    // Crypto Payment Methods
    if (config.BITCOIN?.enabled) {
      this.gateways.set(PaymentMethod.BITCOIN, new BitcoinGateway(config.BITCOIN));
    }

    if (config.ETHEREUM?.enabled) {
      this.gateways.set(PaymentMethod.ETHEREUM, new EthereumGateway(config.ETHEREUM));
    }

    // Manual Credit Card (always available, but controlled by feature flag in store config)
    // We'll add it here, but it will be filtered in getAvailableGateways based on store config
    if (config.MANUAL_CREDIT_CARD?.enabled) {
      this.gateways.set(PaymentMethod.MANUAL_CREDIT_CARD, new ManualCreditCardGateway(config.MANUAL_CREDIT_CARD));
    }
  }

  private getGatewayConfig(): Record<string, PaymentGatewayConfig> {
    return {
      STRIPE: {
        enabled: !!process.env.STRIPE_SECRET_KEY,
        credentials: {
          STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
          STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
        },
      },
      PAYPAL: {
        enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
        credentials: {
          PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
          PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
          PAYPAL_MODE: process.env.PAYPAL_MODE || 'sandbox',
        },
      },
      AMAZON_PAY: {
        enabled: !!(process.env.AMAZON_PAY_MERCHANT_ID && process.env.AMAZON_PAY_ACCESS_KEY),
        credentials: {
          AMAZON_PAY_MERCHANT_ID: process.env.AMAZON_PAY_MERCHANT_ID || '',
          AMAZON_PAY_ACCESS_KEY: process.env.AMAZON_PAY_ACCESS_KEY || '',
          AMAZON_PAY_SECRET_KEY: process.env.AMAZON_PAY_SECRET_KEY || '',
          AMAZON_PAY_MODE: process.env.AMAZON_PAY_MODE || 'sandbox',
        },
      },
      BKASH: {
        enabled: !!(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET),
        credentials: {
          BKASH_APP_KEY: process.env.BKASH_APP_KEY || '',
          BKASH_APP_SECRET: process.env.BKASH_APP_SECRET || '',
          BKASH_USERNAME: process.env.BKASH_USERNAME || '',
          BKASH_PASSWORD: process.env.BKASH_PASSWORD || '',
          BKASH_MODE: process.env.BKASH_MODE || 'sandbox',
        },
      },
      NAGAD: {
        enabled: !!(process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_PUBLIC_KEY),
        credentials: {
          NAGAD_MERCHANT_ID: process.env.NAGAD_MERCHANT_ID || '',
          NAGAD_MERCHANT_NUMBER: process.env.NAGAD_MERCHANT_NUMBER || '',
          NAGAD_PUBLIC_KEY: process.env.NAGAD_PUBLIC_KEY || '',
          NAGAD_PRIVATE_KEY: process.env.NAGAD_PRIVATE_KEY || '',
          NAGAD_MODE: process.env.NAGAD_MODE || 'sandbox',
        },
      },
      ROCKET: {
        enabled: !!(process.env.ROCKET_MERCHANT_ID || process.env.ROCKET_MERCHANT_NUMBER),
        credentials: {
          ROCKET_MERCHANT_ID: process.env.ROCKET_MERCHANT_ID || '',
          ROCKET_MERCHANT_KEY: process.env.ROCKET_MERCHANT_KEY || '',
          ROCKET_MERCHANT_NUMBER: process.env.ROCKET_MERCHANT_NUMBER || '',
          ROCKET_MODE: process.env.ROCKET_MODE || 'sandbox',
        },
      },
      BITCOIN: {
        enabled: process.env.CRYPTO_PAYMENTS_ENABLED === 'true',
        credentials: {
          COINBASE_COMMERCE_API_KEY: process.env.COINBASE_COMMERCE_API_KEY || '',
          COINBASE_COMMERCE_WEBHOOK_SECRET: process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || '',
          BITCOIN_REQUIRED_CONFIRMATIONS: process.env.BITCOIN_REQUIRED_CONFIRMATIONS || '3',
        },
      },
      ETHEREUM: {
        enabled: process.env.CRYPTO_PAYMENTS_ENABLED === 'true',
        credentials: {
          COINBASE_COMMERCE_API_KEY: process.env.COINBASE_COMMERCE_API_KEY || '',
          COINBASE_COMMERCE_WEBHOOK_SECRET: process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || '',
          ETHEREUM_REQUIRED_CONFIRMATIONS: process.env.ETHEREUM_REQUIRED_CONFIRMATIONS || '12',
        },
      },
      MANUAL_CREDIT_CARD: {
        enabled: true, // Always enabled in gateway manager, filtered by store config feature flag
        credentials: {},
      },
    };
  }

  getGateway(method: PaymentMethod): PaymentGateway | undefined {
    return this.gateways.get(method);
  }

  getAvailableGateways(country?: string): PaymentGateway[] {
    return Array.from(this.gateways.values()).filter(
      (gateway) => gateway.isEnabled() && gateway.isSupported(country)
    );
  }

  getAllGateways(): PaymentGateway[] {
    return Array.from(this.gateways.values());
  }
}

// Singleton instance
export const paymentGatewayManager = new PaymentGatewayManager();

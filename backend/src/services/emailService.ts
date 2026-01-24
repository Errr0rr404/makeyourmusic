import logger from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Order type for email service
interface OrderEmailData {
  id: string;
  orderNumber: string;
  totalAmount: number | string;
  status: string;
}

/**
 * Email service
 * In production, integrate with services like:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Nodemailer with SMTP
 */
class EmailService {
  private enabled: boolean;

  constructor() {
    // Enable email service if configured
    this.enabled = !!(
      process.env.EMAIL_SERVICE_ENABLED === 'true' &&
      (process.env.SENDGRID_API_KEY || process.env.AWS_SES_REGION || process.env.SMTP_HOST)
    );
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('Email service not configured, email not sent', {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    try {
      // Email sending not yet implemented
      // To implement, choose one of:
      // - SendGrid: npm install @sendgrid/mail
      // - AWS SES: npm install @aws-sdk/client-ses
      // - Nodemailer: npm install nodemailer
      // See implementation examples in comments below
      
      // Example with SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: options.to,
      //   from: options.from || process.env.EMAIL_FROM,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text,
      // });

      // Don't log success if email wasn't actually sent
      logger.warn('Email service not implemented - email not sent', {
        to: options.to,
        subject: options.subject,
      });

      return false;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: OrderEmailData, userEmail: string): Promise<boolean> {
    const html = `
      <h2>Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Total:</strong> $${order.totalAmount}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p>We'll send you another email when your order ships.</p>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
    });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(order: OrderEmailData, userEmail: string, newStatus: string): Promise<boolean> {
    const html = `
      <h2>Order Status Update</h2>
      <p>Your order status has been updated.</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>New Status:</strong> ${newStatus}</p>
      <p>You can track your order at: ${process.env.FRONTEND_URL}/account/orders/${order.id}</p>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Order ${order.orderNumber} - Status Update`,
      html,
    });
  }
}

export const emailService = new EmailService();

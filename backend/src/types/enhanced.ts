/**
 * Improved TypeScript type definitions for the application
 * This file extends and enhances the existing types with better type safety
 */

// Order Item with proper typing
export interface OrderItemData {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  variantId?: string | null;
  specialInstructions?: string | null;
}

// POS Hold Order Item
export interface HoldOrderItem {
  productId: string;
  quantity: number;
  price: number;
  variantId?: string | null;
  specialInstructions?: string | null;
}

// API Response types
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  database?: {
    status: 'connected' | 'disconnected';
    responseTime?: string;
    error?: string;
  };
  memory?: {
    used: string;
    total: string;
    percentage: string;
  };
  system?: {
    platform: string;
    cpus: number;
    freeMemory: string;
    totalMemory: string;
    loadAverage: number[];
  };
  responseTime?: string;
}

// Workflow execution data
export interface WorkflowExecutionData {
  workflowId: string;
  inputData?: Record<string, any>;
  triggeredBy?: string;
}

// Payment gateway types
export interface PaymentGatewayConfig {
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  environment?: 'sandbox' | 'production';
  [key: string]: any;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  instructions?: string;
  error?: string;
}

// ERP Module types
export interface ERPModuleConfig {
  accountingEnabled?: boolean;
  crmEnabled?: boolean;
  projectsEnabled?: boolean;
  hrEnabled?: boolean;
  documentManagementEnabled?: boolean;
  workflowsEnabled?: boolean;
  aiInsightsEnabled?: boolean;
  businessIntelligenceEnabled?: boolean;
}

// Analytics types
export interface AnalyticsMetrics {
  revenue: number;
  orders: number;
  customers: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByDay: TimeSeriesData[];
  topProducts: Array<{
    productId: string;
    name: string;
    revenue: number;
    quantity: number;
  }>;
}

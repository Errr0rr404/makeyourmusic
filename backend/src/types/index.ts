import { Request } from 'express';
import {
  UserRole,
  PayPeriodType,
  PayPeriodStatus,
  PayrollStatus,
  PayrollItemType,
  AccountType,
  InvoiceStatus,
  LeadStatus,
  ProjectStatus,
} from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  // jti ties refresh tokens to server-side store for rotation/revocation
  jti?: string;
  // sessionId tracks the logical device/session across rotations
  sessionId?: string;
}

export interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    sessionId?: string;
  };
}

// Re-export Prisma enums
export {
  UserRole,
  PayPeriodType,
  PayPeriodStatus,
  PayrollStatus,
  PayrollItemType,
  AccountType,
  InvoiceStatus,
  LeadStatus,
  ProjectStatus,
};

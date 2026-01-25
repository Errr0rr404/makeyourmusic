import { Request } from 'express';

// Define UserRole locally since @prisma/client export isn't properly generated for backend
// Must match Prisma schema enum
export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  MASTERMIND: 'MASTERMIND',
  MANAGER: 'MANAGER',
  CFO: 'CFO',
  HR_MANAGER: 'HR_MANAGER',
  SALES_MANAGER: 'SALES_MANAGER',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  ANALYST: 'ANALYST',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Payment Status enum for payment gateways
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti?: string;
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

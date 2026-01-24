import { UserRole } from '@/generated/prisma/enums';
import type { PaymentMethod } from './payment';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface NextApiRequestWithUser {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

// Re-export Prisma enums
export { UserRole };
// Re-export type-only exports using export type for isolatedModules
export type { PaymentMethod } from './payment';

import { Request } from 'express';

export const UserRole = {
  LISTENER: 'LISTENER',
  AGENT_OWNER: 'AGENT_OWNER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

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

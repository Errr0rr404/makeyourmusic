import { Request } from 'express';
import { UserRole } from './index';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

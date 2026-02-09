import { UserRole } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        sessionId?: string;
      };
    }
  }
}

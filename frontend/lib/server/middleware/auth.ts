import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '../utils/jwt';
import { NextApiRequestWithUser } from '../types';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN' | 'MASTERMIND' | 'MANAGER' | 'CFO' | 'HR_MANAGER' | 'SALES_MANAGER' | 'OPERATIONS_MANAGER' | 'PROJECT_MANAGER' | 'ANALYST';
  };
}

export const authenticate = (req: NextRequest): { user: NextApiRequestWithUser['user'] } | NextResponse => {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.length === 0) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);

    return {
      user: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as 'CUSTOMER' | 'ADMIN' | 'MASTERMIND' | 'MANAGER' | 'CFO' | 'HR_MANAGER' | 'SALES_MANAGER' | 'OPERATIONS_MANAGER' | 'PROJECT_MANAGER' | 'ANALYST',
      },
    };
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
};

export const requireAdmin = (user: NextApiRequestWithUser['user']): NextResponse | null => {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return null;
};

export const requireMastermind = (user: NextApiRequestWithUser['user']): NextResponse | null => {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'MASTERMIND') {
    return NextResponse.json({ error: 'Mastermind access required' }, { status: 403 });
  }

  return null;
};

export const requireAdminOrMastermind = (user: NextApiRequestWithUser['user']): NextResponse | null => {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'ADMIN' && user.role !== 'MASTERMIND') {
    return NextResponse.json({ error: 'Admin or Mastermind access required' }, { status: 403 });
  }

  return null;
};

export const requireManager = (user: NextApiRequestWithUser['user']): NextResponse | null => {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
  }

  return null;
};

export const requireManagerOrAdmin = (user: NextApiRequestWithUser['user']): NextResponse | null => {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Manager or Admin access required' }, { status: 403 });
  }

  return null;
};

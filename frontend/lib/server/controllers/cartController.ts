import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/server/middleware/auth';

// Cart functionality is not available in ERP system
// These are stub handlers

export const getCart = async (req: NextRequest) => {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json({
    items: [],
    total: 0,
    message: 'Cart functionality is not available in ERP system',
  });
};

export const addToCart = async () => {
  return NextResponse.json({
    error: 'Cart functionality is not available in ERP system',
  }, { status: 404 });
};

export const updateCartItem = async () => {
  return NextResponse.json({
    error: 'Cart functionality is not available in ERP system',
  }, { status: 404 });
};

export const removeFromCart = async () => {
  return NextResponse.json({
    error: 'Cart functionality is not available in ERP system',
  }, { status: 404 });
};

export const clearCart = async () => {
  return NextResponse.json({
    error: 'Cart functionality is not available in ERP system',
  }, { status: 404 });
};

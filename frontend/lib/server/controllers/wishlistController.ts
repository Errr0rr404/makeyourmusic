import { NextResponse } from 'next/server';

// Wishlist feature is not available in ERP system
// These are stub functions that return appropriate responses

export const getWishlist = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Wishlist feature is not available in ERP system',
    items: []
  }, { status: 200 });
};

export const addToWishlist = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Wishlist feature is not available in ERP system'
  }, { status: 404 });
};

export const removeFromWishlist = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Wishlist feature is not available in ERP system'
  }, { status: 404 });
};

export const clearWishlist = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: 'Wishlist feature is not available in ERP system'
  }, { status: 404 });
};

export const checkWishlistItem = async (): Promise<NextResponse> => {
  return NextResponse.json({
    inWishlist: false
  }, { status: 200 });
};

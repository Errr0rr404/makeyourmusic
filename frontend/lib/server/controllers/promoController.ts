import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { requireAdminAccess } from '../middleware/authHelpers';
import { PromoCode } from '@/generated/prisma/client';

const serializePromo = (promo: PromoCode) => ({
  ...promo,
  discountValue: Number(promo.discountValue),
  minPurchase: promo.minPurchase ? Number(promo.minPurchase) : null,
  maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
});

export const getPromoCodes = async (req: NextRequest): Promise<NextResponse> => {
  requireAdminAccess(req);

  const promoCodes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ promoCodes: promoCodes.map(serializePromo) });
};

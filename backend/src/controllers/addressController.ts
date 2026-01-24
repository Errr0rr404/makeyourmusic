import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { RequestWithUser } from '../types';
import { getStringParam } from '../utils/request';

// Local enum for e-commerce orders (not part of ERP schema)
enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export const getAddresses = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const type = req.query.type as string | undefined;

    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const addresses = await (prisma as any).address.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ addresses });
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { type, name, line1, line2, city, state, postalCode, country, phone, isDefault } = req.body;

    if (!type || !name || !line1 || !city || !state || !postalCode || !country) {
      throw new AppError('Required fields: type, name, line1, city, state, postalCode, country', 400);
    }

    if (type !== 'shipping' && type !== 'billing') {
      throw new AppError('Type must be "shipping" or "billing"', 400);
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await (prisma as any).address.updateMany({
        where: {
          userId,
          type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await (prisma as any).address.create({
      data: {
        userId,
        type,
        name: name.trim(),
        line1: line1.trim(),
        line2: line2?.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        phone: phone?.trim() || null,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({ address });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const addressId = getStringParam(req, 'addressId');
    const { name, line1, line2, city, state, postalCode, country, phone, isDefault } = req.body;

    if (!addressId) {
      throw new AppError('Address ID is required', 400);
    }

    const address = await (prisma as any).address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    if (address.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    // Check if user has pending orders
    const pendingOrder = await (prisma as any).order.findFirst({
      where: {
        userId,
        status: OrderStatus.PENDING,
      },
    });

    if (pendingOrder) {
      throw new AppError('Cannot edit address while you have a pending order. Please complete or cancel your pending order first.', 400);
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await (prisma as any).address.updateMany({
        where: {
          userId,
          type: address.type,
          isDefault: true,
          id: { not: addressId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updated = await (prisma as any).address.update({
      where: { id: addressId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(line1 !== undefined && { line1: line1.trim() }),
        ...(line2 !== undefined && { line2: line2?.trim() || null }),
        ...(city !== undefined && { city: city.trim() }),
        ...(state !== undefined && { state: state.trim() }),
        ...(postalCode !== undefined && { postalCode: postalCode.trim() }),
        ...(country !== undefined && { country: country.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json({ address: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const addressId = getStringParam(req, 'addressId');

    if (!addressId) {
      throw new AppError('Address ID is required', 400);
    }

    const address = await (prisma as any).address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    if (address.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    // Check if user has pending orders
    const pendingOrder = await (prisma as any).order.findFirst({
      where: {
        userId,
        status: OrderStatus.PENDING,
      },
    });

    if (pendingOrder) {
      throw new AppError('Cannot delete address while you have a pending order. Please complete or cancel your pending order first.', 400);
    }

    await (prisma as any).address.delete({
      where: { id: addressId },
    });

    res.json({ message: 'Address deleted' });
  } catch (error) {
    next(error);
  }
};

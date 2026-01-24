import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// List chart of accounts (read-only)
export const listChartOfAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prismaClient = prisma as any;
    if (!prismaClient.chartOfAccount) {
      return res.json([]);
    }

    const accounts = await prismaClient.chartOfAccount.findMany({ orderBy: { accountNumber: 'asc' } });
    res.json(accounts);
  } catch (error: any) {
    logger.error('Error listing chart of accounts', { error: error.message });
    next(error);
  }
};

export const createChartOfAccount = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { accountNumber, accountName, accountType, parentId, description } = req.body;
    if (!accountNumber || !accountName || !accountType) {
      throw new AppError('accountNumber, accountName and accountType are required', 400);
    }

    const prismaClient = prisma as any;
    if (!prismaClient.chartOfAccount) {
      throw new AppError('ChartOfAccount model not available', 500);
    }

    const created = await prismaClient.chartOfAccount.create({
      data: {
        accountNumber: String(accountNumber),
        accountName: String(accountName),
        accountType: String(accountType),
        parentId: parentId || null,
        description: description || null,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

// List invoices
export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prismaClient = prisma as any;
    if (!prismaClient.invoice) {
      return res.json([]);
    }

    const invoices = await prismaClient.invoice.findMany({ orderBy: { issueDate: 'desc' } });
    res.json(invoices);
  } catch (error: any) {
    logger.error('Error listing invoices', { error: error.message });
    next(error);
  }
};

export const createInvoice = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { invoiceNumber, issueDate, dueDate, total, createdBy } = req.body;
    if (!invoiceNumber || !issueDate || total === undefined) {
      throw new AppError('Missing required invoice fields', 400);
    }

    const prismaClient = prisma as any;
    if (!prismaClient.invoice) {
      throw new AppError('Invoice model not available', 500);
    }

    const created = await prismaClient.invoice.create({
      data: {
        invoiceNumber: String(invoiceNumber),
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        total: prismaClient.$queryRaw`to_number(${total}::text, '999999999.99')`,
        createdBy: createdBy || req.user?.userId || 'system',
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// List chart of accounts (read-only)
export const listChartOfAccounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prismaClient = prisma as any;
    if (!prismaClient.chartOfAccount) {
      return res.json([]);
    }

    const accounts = await prismaClient.chartOfAccount.findMany({ orderBy: { accountNumber: 'asc' } });
    res.json(accounts);
  } catch (error: any) {
    logger.error('Error listing chart of accounts', { error: error.message });
    return next(error);
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
    return next(error);
  }
};

// List invoices
export const listInvoices = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prismaClient = prisma as any;
    if (!prismaClient.invoice) {
      res.json([]);
      return;
    }

    const invoices = await prismaClient.invoice.findMany({ orderBy: { issueDate: 'desc' } });
    res.json(invoices);
  } catch (error: any) {
    logger.error('Error listing invoices', { error: error.message });
    return next(error);
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

    // Validate and convert dates
    const issueDateObj = new Date(issueDate);
    if (isNaN(issueDateObj.getTime())) {
      throw new AppError('Invalid issue date format', 400);
    }

    let dueDateObj: Date | null = null;
    if (dueDate) {
      dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        throw new AppError('Invalid due date format', 400);
      }
      if (dueDateObj < issueDateObj) {
        throw new AppError('Due date must be after issue date', 400);
      }
    }

    // Convert total to number - ensure it's a valid number
    const totalNumber = typeof total === 'string' ? parseFloat(total) : Number(total);
    if (isNaN(totalNumber) || totalNumber < 0) {
      throw new AppError('Invalid total value', 400);
    }

    const created = await prismaClient.invoice.create({
      data: {
        invoiceNumber: String(invoiceNumber),
        issueDate: issueDateObj,
        dueDate: dueDateObj,
        total: totalNumber,
        createdBy: createdBy || req.user?.userId || 'system',
      },
    });

    res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

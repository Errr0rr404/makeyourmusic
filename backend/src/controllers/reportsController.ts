import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';

/**
 * Generate a report
 */
export const generateReport = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { reportType, title, dateRangeStart, dateRangeEnd } = req.body;

    if (!reportType || !dateRangeStart || !dateRangeEnd) {
      throw new AppError('Report type, start date, and end date are required', 400);
    }

    const prismaClient = prisma as any;

    // In a real ERP, you would have a complex report generation service.
    // For this simplified version, we'll just create a record.
    const report = await prismaClient.report.create({
      data: {
        reportType,
        title: title || `${reportType} Report`,
        dateRangeStart: new Date(dateRangeStart),
        dateRangeEnd: new Date(dateRangeEnd),
        data: { message: "Report generation is a placeholder in this version." },
        createdBy: req.user?.userId,
      },
    });

    res.status(201).json(report);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all reports
 */
export const getReports = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { page, limit, reportType } = req.query;
    const pageNum = parseInt(String(page || '1'), 10) || 1;
    const limitNum = parseInt(String(limit || '20'), 10) || 20;
    const { skip, limit: take } = getPaginationParams(pageNum, limitNum);

    const prismaClient = prisma as any;
    const where: any = {};
    if (reportType) where.reportType = reportType;

    const [reports, total] = await Promise.all([
      prismaClient.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prismaClient.report.count({ where }),
    ]);

    res.json(formatPaginationResponse(reports, total, pageNum, limitNum));
  } catch (error) {
    return next(error);
  }
};

/**
 * Get a single report
 */
export const getReport = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const prismaClient = prisma as any;
    const report = await prismaClient.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    res.json(report);
  } catch (error) {
    return next(error);
  }
};

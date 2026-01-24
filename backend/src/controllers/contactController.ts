import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { prisma } from '../utils/db';
import { AppError } from '../middleware/errorHandler';
import { getStringParam, getStringQuery, getNumberQuery } from '../utils/request';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination';
import { validateEmail, validateNonEmptyString } from '../utils/validation';
import { isFeatureEnabled } from '../utils/storeConfig';

// Type workaround for Prisma client with ContactMessage model
const prismaWithContact = prisma as any;

// Submit contact form
export const submitContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if contact form is enabled
    const contactFormEnabled = await isFeatureEnabled('contactFormEnabled');
    if (!contactFormEnabled) {
      throw new AppError('Contact form is not enabled for this store', 403);
    }

    const { name, email, subject, message } = req.body;

    // Use centralized validation
    const nameValidation = validateNonEmptyString(name, 'Name');
    if (!nameValidation.valid) {
      throw new AppError(nameValidation.message || 'Name is required', 400);
    }
    
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new AppError(emailValidation.message || 'Valid email is required', 400);
    }
    
    const subjectValidation = validateNonEmptyString(subject, 'Subject');
    if (!subjectValidation.valid) {
      throw new AppError(subjectValidation.message || 'Subject is required', 400);
    }
    
    const messageValidation = validateNonEmptyString(message, 'Message');
    if (!messageValidation.valid) {
      throw new AppError(messageValidation.message || 'Message is required', 400);
    }

    const contactMessage = await prismaWithContact.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    res.status(201).json({
      message: 'Thank you for contacting us. We will get back to you soon.',
      id: contactMessage.id,
    });
  } catch (error) {
    next(error);
  }
};

// Get all contact messages (admin)
export const getContactMessages = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      getNumberQuery(req, 'page', 1),
      getNumberQuery(req, 'limit', 50),
      50,
      100
    );
    const status = getStringQuery(req, 'status');

    const where: { status?: string } = {};
    if (status) {
      where.status = status;
    }

    const [messages, total] = await Promise.all([
      prismaWithContact.contactMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prismaWithContact.contactMessage.count({ where }),
    ]);

    const response = formatPaginationResponse(messages, total, page, limit);
    
    res.json({
      messages: response.data,
      pagination: response.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get single contact message (admin)
export const getContactMessage = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');

    if (!id) {
      throw new AppError('Message ID is required', 400);
    }

    const message = await prismaWithContact.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    res.json(message);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Message not found', 404));
    }
    next(error);
  }
};

// Respond to contact message (admin)
export const respondToMessage = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');
    const { response, status } = req.body;

    if (!id) {
      throw new AppError('Message ID is required', 400);
    }

    if (!response || typeof response !== 'string' || response.trim().length === 0) {
      throw new AppError('Response is required', 400);
    }

    const userId = req.user!.userId;
    const updateData: any = {
      response: response.trim(),
      respondedAt: new Date(),
      respondedBy: userId,
    };

    if (status && ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'].includes(status)) {
      updateData.status = status;
    } else {
      updateData.status = 'RESOLVED';
    }

    const message = await prismaWithContact.contactMessage.update({
      where: { id },
      data: updateData,
    });

    res.json(message);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Message not found', 404));
    }
    next(error);
  }
};

// Update message status (admin)
export const updateMessageStatus = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');
    const { status } = req.body;

    if (!id) {
      throw new AppError('Message ID is required', 400);
    }

    if (!status || !['PENDING', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'].includes(status)) {
      throw new AppError('Valid status is required', 400);
    }

    const message = await prismaWithContact.contactMessage.update({
      where: { id },
      data: { status },
    });

    res.json(message);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Message not found', 404));
    }
    next(error);
  }
};

// Delete contact message (admin)
export const deleteContactMessage = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req, 'id');

    if (!id) {
      throw new AppError('Message ID is required', 400);
    }

    await prismaWithContact.contactMessage.delete({
      where: { id },
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(new AppError('Message not found', 404));
    }
    next(error);
  }
};

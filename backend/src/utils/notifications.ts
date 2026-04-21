import { prisma } from './db';
import logger from './logger';

type NotificationType = 'NEW_TRACK' | 'NEW_FOLLOWER' | 'TRACK_LIKED' | 'COMMENT' | 'SYSTEM';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ? (input.data as any) : undefined,
      },
    });
  } catch (err) {
    // Never let notification failures break the triggering action
    logger.error('createNotification failed', {
      userId: input.userId,
      type: input.type,
      error: (err as Error).message,
    });
  }
}

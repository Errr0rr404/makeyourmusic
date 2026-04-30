// Polls outstanding auto-preview-video jobs and writes the result URL back
// to Track.previewVideoUrl when they complete. Each Hailuo job goes through
// Queueing → Preparing → Processing → Success / Fail. We only call the file
// retrieve endpoint on Success.
//
// Called from the cron tick (every 5 minutes is plenty — these jobs take
// 30-90s upstream). Idempotent: a job that has already been resolved is
// skipped because its row is no longer in PROCESSING.

import { prisma } from './db';
import logger from './logger';
import { minimaxQueryVideo, minimaxRetrieveFile } from './minimax';

const MAX_PER_TICK = 20;

export async function pollPreviewVideos(): Promise<{ processed: number; resolved: number }> {
  const pending = await prisma.videoGeneration.findMany({
    where: { purpose: 'preview', status: 'PROCESSING', providerJobId: { not: null } },
    take: MAX_PER_TICK,
    orderBy: { createdAt: 'asc' },
  });
  let resolved = 0;
  for (const job of pending) {
    try {
      const status = await minimaxQueryVideo(job.providerJobId!);
      if (status.status === 'Success' && status.fileId) {
        const { downloadUrl } = await minimaxRetrieveFile(status.fileId);
        await prisma.$transaction(async (tx) => {
          await tx.videoGeneration.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              videoUrl: downloadUrl,
              providerFileId: status.fileId!,
            },
          });
          if (job.trackId) {
            await tx.track.update({
              where: { id: job.trackId },
              data: { previewVideoUrl: downloadUrl },
            });
          }
        });
        resolved += 1;
      } else if (status.status === 'Fail') {
        await prisma.videoGeneration.update({
          where: { id: job.id },
          data: { status: 'FAILED', errorMessage: 'Provider reported failure' },
        });
      }
    } catch (err) {
      logger.warn('previewVideoPoller: job tick failed', {
        jobId: job.id,
        error: (err as Error).message,
      });
    }
  }
  return { processed: pending.length, resolved };
}

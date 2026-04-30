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
const STUCK_AFTER_MS = 30 * 60 * 1000; // 30 min — Hailuo Fast jobs finish in 30-90s.

// Module-level mutex prevents two cron ticks of the SAME process from
// running pollPreviewVideos concurrently (when a previous tick takes longer
// than the 5-min interval). Cross-process safety is via the advisory lock
// in cronTick.ts.
let running = false;

export async function pollPreviewVideos(): Promise<{ processed: number; resolved: number }> {
  if (running) {
    return { processed: 0, resolved: 0 };
  }
  running = true;
  try {
  // First sweep: age out jobs that have been PROCESSING for too long. The
  // upstream might have lost the task; better to FAIL than to keep polling.
  const stuckCutoff = new Date(Date.now() - STUCK_AFTER_MS);
  await prisma.videoGeneration.updateMany({
    where: {
      purpose: 'preview',
      status: 'PROCESSING',
      createdAt: { lt: stuckCutoff },
    },
    data: { status: 'FAILED', errorMessage: 'Preview video timed out' },
  });

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
  } finally {
    running = false;
  }
}

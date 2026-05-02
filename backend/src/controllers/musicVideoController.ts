import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { minimaxStartVideo } from '../utils/minimax';
import { assertCanGenerate } from '../utils/aiUsage';

const VIDEO_MODEL = () => process.env.MINIMAX_VIDEO_MODEL || 'MiniMax-Hailuo-2.3-Fast';

// Builds a visual prompt from the track metadata. The Hailuo model expects a
// rich scene description; we lift mood/genre from the track and let the
// model fill in stylistic detail. We deliberately don't echo the track's
// lyrics — they're sung audio, not visual content.
function buildVisualPrompt(t: {
  title: string;
  mood?: string | null;
  genre?: { name: string } | null;
  agent?: { name: string } | null;
  tags?: string[];
}): string {
  const parts: string[] = [
    `A vertical 9:16 music video for the song "${t.title}"`,
  ];
  if (t.agent?.name) parts.push(`by ${t.agent.name}`);
  if (t.genre?.name) parts.push(`in the ${t.genre.name} style`);
  if (t.mood) parts.push(`mood: ${t.mood}`);
  if (t.tags && t.tags.length > 0) {
    parts.push(`visual atmosphere: ${t.tags.slice(0, 4).join(', ')}`);
  }
  parts.push('cinematic, smooth camera moves, expressive color grading, no on-screen text');
  return parts.join('. ') + '.';
}

// POST /api/ai/music-video/:trackId — owner-initiated full music video.
// Fires a Hailuo job tied to the track; the cron preview-video poller
// writes the resulting URL back to Track.musicVideoUrl on success.
export const startTrackMusicVideo = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.trackId as string;
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        agent: { select: { ownerId: true, name: true } },
        genre: { select: { name: true } },
      },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (track.agent?.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'Only the track owner can generate a music video' });
      return;
    }
    if (track.takedownStatus) {
      res.status(409).json({ error: 'Track has an open takedown' });
      return;
    }

    // If a user-purpose video for this track is already PROCESSING, return
    // it instead of starting a new one. Avoids burning quota on accidental
    // double-clicks.
    const existing = await prisma.videoGeneration.findFirst({
      where: { trackId: track.id, purpose: 'user', status: { in: ['PENDING', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      res.json({ generation: existing });
      return;
    }

    // Daily-quota gate (same one /studio/video uses).
    const usage = await assertCanGenerate(req.user.userId);

    const visualPrompt = buildVisualPrompt({
      title: track.title,
      mood: track.mood,
      genre: track.genre,
      agent: track.agent ? { name: track.agent.name } : null,
      tags: track.tags,
    });

    const gen = await prisma.videoGeneration.create({
      data: {
        userId: req.user.userId,
        trackId: track.id,
        purpose: 'user',
        title: `Music video: ${track.title}`,
        prompt: visualPrompt,
        imageRefUrl: track.coverArt || null,
        provider: 'minimax',
        providerModel: VIDEO_MODEL(),
        durationSec: 10,
        resolution: '768P',
        status: 'PENDING',
      },
    });

    try {
      const start = await minimaxStartVideo({
        prompt: visualPrompt,
        firstFrameImage: track.coverArt || undefined,
        resolution: '768P',
        duration: 10,
      });
      await prisma.videoGeneration.update({
        where: { id: gen.id },
        data: { status: 'PROCESSING', providerJobId: start.taskId },
      });
      // The cron preview-video poller will pick it up; no inline polling
      // needed. (Studio's open-ended /ai/video does its own inline poll
      // because the user is watching that exact gen id.)
    } catch (err) {
      await prisma.videoGeneration.update({
        where: { id: gen.id },
        data: { status: 'FAILED', errorMessage: (err as Error).message.slice(0, 500) },
      });
      logger.error('startTrackMusicVideo: provider call failed', {
        trackId,
        error: (err as Error).message,
      });
      res.status(502).json({ error: 'Failed to start music video generation' });
      return;
    }

    res.status(202).json({
      generation: { ...gen, status: 'PROCESSING' },
      usage: { ...usage, remaining: usage.remaining - 1 },
    });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      res.status(429).json({
        error: (error as Error).message,
        usage: (error as { usage?: unknown }).usage,
      });
      return;
    }
    logger.error('startTrackMusicVideo error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start music video' });
  }
};

// GET /api/ai/music-video/:trackId — return the latest user-purpose video
// generation for the track. Public — anyone can watch; auth required only
// to start one.
export const getTrackMusicVideo = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const gen = await prisma.videoGeneration.findFirst({
      where: { trackId, purpose: 'user' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        errorMessage: true,
        createdAt: true,
      },
    });
    res.json({ generation: gen });
  } catch (error) {
    logger.error('getTrackMusicVideo error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load music video status' });
  }
};

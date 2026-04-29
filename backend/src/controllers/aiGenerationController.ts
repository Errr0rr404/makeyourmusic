import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import {
  minimaxGenerateLyrics,
  minimaxGenerateMusic,
  minimaxStartVideo,
  minimaxQueryVideo,
  minimaxRetrieveFile,
} from '../utils/minimax';
import { assertCanGenerate, getDailyUsage } from '../utils/aiUsage';
import { slugify, uniqueSuffix } from '../utils/slugify';
import { uploadAudio } from '../utils/cloudinary';

const MAX_LYRICS_LEN = 3500;
const MAX_PROMPT_LEN = 2000;
const MUSIC_MODEL = () => process.env.MINIMAX_MUSIC_MODEL || 'music-2.6-free';
const VIDEO_MODEL = () => process.env.MINIMAX_VIDEO_MODEL || 'video-01';
const FRESH_TAKE_SUFFIX = (generationId: string) =>
  `Fresh take ${generationId.slice(-8)}: create a new arrangement and do not reuse previous audio.`;

function providerPromptForGeneration(prompt: string | null, generationId: string): string {
  const suffix = FRESH_TAKE_SUFFIX(generationId);
  const base = (prompt || '').trim();
  if (!base) return suffix;
  const maxBaseLength = Math.max(0, MAX_PROMPT_LEN - suffix.length - 1);
  return `${base.slice(0, maxBaseLength)}\n${suffix}`;
}

function hasCloudinaryCredentials(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function persistProviderAudioUrl(url: string, generationId: string): Promise<string> {
  // No Cloudinary configured: keep the provider URL. The admin opted into this
  // tradeoff (provider URLs from MiniMax expire — typically within hours).
  if (!hasCloudinaryCredentials()) return url;

  // Cloudinary IS configured: any failure here is a real failure. Returning
  // the provider URL anyway would silently produce tracks that 404 once the
  // upstream URL expires.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to download provider audio (${res.status})`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length === 0) throw new Error('provider audio download was empty');
  const uploaded = await uploadAudio(audio, `generation-${generationId}-${Date.now()}`);
  return uploaded.secure_url;
}

async function audioUrlFromGenerationResult(
  generationId: string,
  result: Awaited<ReturnType<typeof minimaxGenerateMusic>>
): Promise<string> {
  if (result.audioUrl) {
    return persistProviderAudioUrl(result.audioUrl, generationId);
  }

  if (result.audioHex) {
    if (!hasCloudinaryCredentials()) {
      throw new Error('MiniMax returned hex audio, but Cloudinary credentials are not configured');
    }
    const audio = Buffer.from(result.audioHex, 'hex');
    if (audio.length === 0) throw new Error('MiniMax returned empty audio');
    const uploaded = await uploadAudio(audio, `generation-${generationId}-${Date.now()}`);
    return uploaded.secure_url;
  }

  throw new Error('MiniMax completed without audio output');
}

// ─── Lyrics (synchronous, fast) ───────────────────────────

export const generateLyrics = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { idea, genre, mood, style, language } = req.body || {};
    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      res.status(400).json({ error: 'idea is required' });
      return;
    }
    if (idea.length > MAX_PROMPT_LEN) {
      res.status(400).json({ error: `idea must be ${MAX_PROMPT_LEN} characters or less` });
      return;
    }

    const result = await minimaxGenerateLyrics({
      idea,
      genre: typeof genre === 'string' ? genre : undefined,
      mood: typeof mood === 'string' ? mood : undefined,
      style: typeof style === 'string' ? style : undefined,
      language: typeof language === 'string' ? language : 'English',
    });

    res.json({ lyrics: result.lyrics });
  } catch (error) {
    logger.error('Generate lyrics error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to generate lyrics' });
  }
};

// ─── Music generation (async via background task) ─────────

async function processMusicGeneration(generationId: string): Promise<void> {
  const gen = await prisma.musicGeneration.findUnique({ where: { id: generationId } });
  if (!gen) return;

  try {
    await prisma.musicGeneration.update({
      where: { id: generationId },
      data: { status: 'PROCESSING' },
    });

    const result = await minimaxGenerateMusic({
      prompt: providerPromptForGeneration(gen.prompt, generationId),
      lyrics: gen.lyrics || undefined,
      isInstrumental: gen.isInstrumental,
      model: gen.providerModel || undefined,
      outputFormat: 'url',
    });
    const audioUrl = await audioUrlFromGenerationResult(generationId, result);

    await prisma.musicGeneration.update({
      where: { id: generationId },
      data: {
        status: 'COMPLETED',
        audioUrl,
        durationSec: result.durationSec || gen.durationSec,
        providerTraceId: result.traceId || null,
      },
    });
  } catch (err) {
    const message = (err as Error).message || 'Music generation failed';
    logger.error('Music generation failed', { generationId, error: message });
    await prisma.musicGeneration
      .update({
        where: { id: generationId },
        data: { status: 'FAILED', errorMessage: message.slice(0, 500) },
      })
      .catch(() => undefined);
  }
}

export const startMusicGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const usage = await assertCanGenerate(req.user.userId);

    const {
      title,
      prompt,
      lyrics,
      genre,
      mood,
      durationSec,
      isInstrumental,
      agentId,
    } = req.body || {};

    if (!isInstrumental && (!lyrics || typeof lyrics !== 'string')) {
      res.status(400).json({ error: 'lyrics are required for non-instrumental tracks' });
      return;
    }
    if (lyrics && lyrics.length > MAX_LYRICS_LEN) {
      res.status(400).json({ error: `lyrics must be ${MAX_LYRICS_LEN} characters or less` });
      return;
    }
    if (prompt && typeof prompt === 'string' && prompt.length > MAX_PROMPT_LEN) {
      res.status(400).json({ error: `prompt must be ${MAX_PROMPT_LEN} characters or less` });
      return;
    }

    if (agentId) {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        select: { id: true, ownerId: true },
      });
      if (!agent || agent.ownerId !== req.user.userId) {
        res.status(403).json({ error: 'You do not own this agent' });
        return;
      }
    }

    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: typeof agentId === 'string' ? agentId : null,
        title: typeof title === 'string' ? title.slice(0, 200) : null,
        prompt: typeof prompt === 'string' ? prompt : null,
        lyrics: typeof lyrics === 'string' ? lyrics : null,
        genre: typeof genre === 'string' ? genre.slice(0, 50) : null,
        mood: typeof mood === 'string' ? mood.slice(0, 50) : null,
        durationSec: typeof durationSec === 'number' ? durationSec : null,
        isInstrumental: Boolean(isInstrumental),
        provider: 'minimax',
        providerModel: MUSIC_MODEL(),
        status: 'PENDING',
      },
    });

    // Kick off background processing — do not await
    void processMusicGeneration(generation.id);

    res.status(202).json({ generation, usage: { ...usage, remaining: usage.remaining - 1 } });
  } catch (error) {
    const statusCode = (error as any).statusCode;
    if (statusCode === 429) {
      res.status(429).json({
        error: (error as Error).message,
        usage: (error as any).usage,
      });
      return;
    }
    logger.error('Start music generation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start music generation' });
  }
};

// ─── List generations ─────────────────────────────────────

export const listGenerations = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const [music, video, total] = await Promise.all([
      prisma.musicGeneration.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agent: { select: { id: true, name: true, slug: true, avatar: true } },
          track: { select: { id: true, slug: true, title: true, isPublic: true } },
        },
      }),
      prisma.videoGeneration.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.musicGeneration.count({ where: { userId: req.user.userId } }),
    ]);

    res.json({ music, video, total, page });
  } catch (error) {
    logger.error('List generations error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list generations' });
  }
};

export const getGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const gen = await prisma.musicGeneration.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        track: { select: { id: true, slug: true, title: true, isPublic: true } },
      },
    });
    if (!gen || gen.userId !== req.user.userId) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    res.json({ generation: gen });
  } catch (error) {
    logger.error('Get generation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get generation' });
  }
};

export const deleteGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const gen = await prisma.musicGeneration.findUnique({ where: { id } });
    if (!gen || gen.userId !== req.user.userId) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    await prisma.musicGeneration.delete({ where: { id } });
    res.json({ message: 'Generation deleted' });
  } catch (error) {
    logger.error('Delete generation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete generation' });
  }
};

// ─── Publish generation as a Track ────────────────────────

export const publishGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const gen = await prisma.musicGeneration.findUnique({ where: { id } });
    if (!gen || gen.userId !== req.user.userId) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    if (gen.status !== 'COMPLETED' || !gen.audioUrl) {
      res.status(400).json({ error: 'Generation is not complete yet' });
      return;
    }
    if (gen.trackId) {
      res.status(400).json({ error: 'Generation has already been published' });
      return;
    }

    const { title, agentId, genreId, coverArt, isPublic, mood } = req.body || {};
    const finalTitle = (typeof title === 'string' && title.trim()) || gen.title || 'Untitled track';
    const targetAgentId = typeof agentId === 'string' ? agentId : gen.agentId;

    if (!targetAgentId) {
      res
        .status(400)
        .json({ error: 'agentId is required — pick which agent to publish under' });
      return;
    }

    const agent = await prisma.aiAgent.findUnique({
      where: { id: targetAgentId },
      select: { id: true, ownerId: true },
    });
    if (!agent || agent.ownerId !== req.user.userId) {
      res.status(403).json({ error: 'You do not own this agent' });
      return;
    }

    let slug = slugify(finalTitle, 80) || `track-${uniqueSuffix()}`;
    const existing = await prisma.track.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${uniqueSuffix()}`;

    const created = await prisma.$transaction(async (tx) => {
      const track = await tx.track.create({
        data: {
          title: finalTitle,
          slug,
          duration: gen.durationSec || 120,
          audioUrl: gen.audioUrl as string,
          coverArt: typeof coverArt === 'string' ? coverArt : null,
          status: 'ACTIVE',
          isPublic: isPublic === false ? false : true,
          mood: typeof mood === 'string' ? mood : gen.mood,
          lyrics: gen.lyrics,
          aiModel: gen.providerModel,
          aiPrompt: gen.prompt,
          agentId: agent.id,
          genreId: typeof genreId === 'string' ? genreId : null,
        },
      });

      await tx.musicGeneration.update({
        where: { id: gen.id },
        data: { trackId: track.id, agentId: agent.id },
      });

      return track;
    });

    res.status(201).json({ track: created });
  } catch (error) {
    logger.error('Publish generation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to publish generation' });
  }
};

// ─── Variation (regenerate with same lyrics, new music) ───

export const createVariation = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    const source = await prisma.musicGeneration.findUnique({ where: { id } });
    if (!source || source.userId !== req.user.userId) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    const usage = await assertCanGenerate(req.user.userId);

    // Allow overrides for prompt / genre / mood / duration / isInstrumental; keep lyrics by default
    const {
      prompt,
      genre,
      mood,
      durationSec,
      isInstrumental,
      title,
    } = req.body || {};

    const finalTitle =
      typeof title === 'string' && title.trim()
        ? title.slice(0, 200)
        : source.title
          ? `${source.title} (variation)`
          : 'Variation';

    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: source.agentId,
        title: finalTitle,
        prompt: typeof prompt === 'string' ? prompt : source.prompt,
        lyrics: source.lyrics,
        genre: typeof genre === 'string' ? genre.slice(0, 50) : source.genre,
        mood: typeof mood === 'string' ? mood.slice(0, 50) : source.mood,
        durationSec: typeof durationSec === 'number' ? durationSec : source.durationSec,
        isInstrumental:
          typeof isInstrumental === 'boolean' ? isInstrumental : source.isInstrumental,
        provider: 'minimax',
        providerModel: MUSIC_MODEL(),
        status: 'PENDING',
      },
    });

    void processMusicGeneration(generation.id);

    res.status(202).json({ generation, usage: { ...usage, remaining: usage.remaining - 1 } });
  } catch (error) {
    const statusCode = (error as any).statusCode;
    if (statusCode === 429) {
      res.status(429).json({
        error: (error as Error).message,
        usage: (error as any).usage,
      });
      return;
    }
    logger.error('Create variation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create variation' });
  }
};

// ─── Usage ────────────────────────────────────────────────

export const getUsage = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const usage = await getDailyUsage(req.user.userId);
    res.json({ usage });
  } catch (error) {
    logger.error('Get usage error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get usage' });
  }
};

// ─── Video generation (async) ─────────────────────────────

async function pollVideoGeneration(generationId: string, providerJobId: string): Promise<void> {
  const MAX_POLLS = 60; // ~10 min at 10s
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, 10_000));

    // Abort if the user deleted the generation record
    const existing = await prisma.videoGeneration.findUnique({
      where: { id: generationId },
      select: { id: true, status: true },
    });
    if (!existing) return;
    if (existing.status === 'COMPLETED' || existing.status === 'FAILED') return;

    try {
      const status = await minimaxQueryVideo(providerJobId);
      if (status.status === 'Success' && status.fileId) {
        const file = await minimaxRetrieveFile(status.fileId);
        await prisma.videoGeneration.updateMany({
          where: { id: generationId },
          data: {
            status: 'COMPLETED',
            providerFileId: status.fileId,
            videoUrl: file.downloadUrl,
          },
        });
        return;
      }
      if (status.status === 'Fail') {
        await prisma.videoGeneration.updateMany({
          where: { id: generationId },
          data: { status: 'FAILED', errorMessage: 'Provider returned Fail' },
        });
        return;
      }
      // else keep polling
      await prisma.videoGeneration.updateMany({
        where: { id: generationId },
        data: { status: 'PROCESSING' },
      });
    } catch (err) {
      logger.error('Video poll error', { generationId, error: (err as Error).message });
      // Don't abort on transient errors, try again
    }
  }
  // Timed out
  await prisma.videoGeneration
    .updateMany({
      where: { id: generationId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'FAILED', errorMessage: 'Timed out waiting for provider' },
    })
    .catch(() => undefined);
}

export const startVideoGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const usage = await assertCanGenerate(req.user.userId);

    const { title, prompt, imageRefUrl } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    if (prompt.length > MAX_PROMPT_LEN) {
      res.status(400).json({ error: `prompt must be ${MAX_PROMPT_LEN} characters or less` });
      return;
    }

    const gen = await prisma.videoGeneration.create({
      data: {
        userId: req.user.userId,
        title: typeof title === 'string' ? title.slice(0, 200) : null,
        prompt,
        imageRefUrl: typeof imageRefUrl === 'string' ? imageRefUrl : null,
        provider: 'minimax',
        providerModel: VIDEO_MODEL(),
        status: 'PENDING',
      },
    });

    try {
      const start = await minimaxStartVideo({
        prompt,
        firstFrameImage: typeof imageRefUrl === 'string' ? imageRefUrl : undefined,
      });
      await prisma.videoGeneration.update({
        where: { id: gen.id },
        data: {
          status: 'PROCESSING',
          providerJobId: start.taskId,
        },
      });
      void pollVideoGeneration(gen.id, start.taskId);
    } catch (err) {
      await prisma.videoGeneration.update({
        where: { id: gen.id },
        data: {
          status: 'FAILED',
          errorMessage: (err as Error).message.slice(0, 500),
        },
      });
      throw err;
    }

    res.status(202).json({ generation: gen, usage: { ...usage, remaining: usage.remaining - 1 } });
  } catch (error) {
    const statusCode = (error as any).statusCode;
    if (statusCode === 429) {
      res.status(429).json({
        error: (error as Error).message,
        usage: (error as any).usage,
      });
      return;
    }
    logger.error('Start video generation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start video generation' });
  }
};

export const getVideoGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const gen = await prisma.videoGeneration.findUnique({ where: { id } });
    if (!gen || gen.userId !== req.user.userId) {
      res.status(404).json({ error: 'Video generation not found' });
      return;
    }
    res.json({ generation: gen });
  } catch (error) {
    logger.error('Get video generation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get video generation' });
  }
};

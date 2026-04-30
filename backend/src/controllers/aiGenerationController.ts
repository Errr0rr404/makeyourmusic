import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import {
  minimaxGenerateLyrics,
  minimaxGenerateMusic,
  minimaxGenerateImage,
  minimaxStartVideo,
  minimaxQueryVideo,
  minimaxRetrieveFile,
  minimaxTranslateVibeReference,
  minimaxOrchestrate,
  MinimaxRateLimitError,
  type OrchestrationPlan,
} from '../utils/minimax';
import {
  lookupSubgenreHint,
  lookupEnergyHint,
  lookupVocalStyleHint,
  lookupEraHint,
} from '../utils/musicCatalog';
import { assertCanGenerate, getDailyUsage } from '../utils/aiUsage';
import { slugify, uniqueSuffix } from '../utils/slugify';
import { uploadAudio, uploadImageBase64, uploadCoverArt } from '../utils/cloudinary';
import { sanitizeLyrics } from '../utils/lyricsSanitizer';

const MAX_LYRICS_LEN = 3500;
const MAX_PROMPT_LEN = 2000;
const MUSIC_MODEL = () => process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
const MUSIC_FALLBACK_MODEL = () => process.env.MINIMAX_MUSIC_FALLBACK_MODEL || 'music-2.5';
const VIDEO_MODEL = () => process.env.MINIMAX_VIDEO_MODEL || 'MiniMax-Hailuo-2.3-Fast';
const FRESH_TAKE_SUFFIX = (generationId: string) =>
  `Fresh take ${generationId.slice(-8)}: create a new arrangement and do not reuse previous audio.`;

function providerPromptForGeneration(prompt: string | null, generationId: string): string {
  const suffix = FRESH_TAKE_SUFFIX(generationId);
  const base = (prompt || '').trim();
  if (!base) return suffix;
  const maxBaseLength = Math.max(0, MAX_PROMPT_LEN - suffix.length - 1);
  return `${base.slice(0, maxBaseLength)}\n${suffix}`;
}

interface MusicPromptInput {
  idea?: string | null;
  title?: string | null;
  genre?: string | null;
  subGenre?: string | null;
  mood?: string | null;
  energy?: string | null;
  era?: string | null;
  vocalStyle?: string | null;
  vibeReference?: string | null;
  /** Free-text legacy "extra style notes" field. */
  style?: string | null;
  isInstrumental?: boolean;
}

interface BuiltMusicPrompt {
  prompt: string;
  vibeDescriptors: string;
}

// Compose a rich production prompt from structured inputs + catalog hints.
// Output is a multi-line string fed straight into MiniMax music generation.
async function buildMusicPrompt(input: MusicPromptInput): Promise<BuiltMusicPrompt> {
  const parts: string[] = [];

  const genreLine = [input.genre, input.subGenre].filter(Boolean).join(' / ');
  if (genreLine) parts.push(`Genre: ${genreLine}`);

  const subHint = lookupSubgenreHint(input.subGenre);
  if (subHint) parts.push(`Production: ${subHint}`);

  if (input.mood) parts.push(`Mood: ${input.mood}`);

  if (input.energy) {
    const energyHint = lookupEnergyHint(input.energy);
    parts.push(`Energy: ${input.energy}${energyHint ? ` (${energyHint})` : ''}`);
  }

  if (input.era) {
    const eraHint = lookupEraHint(input.era);
    parts.push(`Era: ${input.era}${eraHint ? ` (${eraHint})` : ''}`);
  }

  if (!input.isInstrumental && input.vocalStyle) {
    const vHint = lookupVocalStyleHint(input.vocalStyle);
    parts.push(`Vocals: ${vHint || input.vocalStyle}`);
  }

  // Translate user-named artists/bands into musical descriptors so we don't
  // trip provider copyright filters and so the model gets actionable cues.
  let vibeDescriptors = '';
  if (input.vibeReference?.trim()) {
    try {
      vibeDescriptors = await minimaxTranslateVibeReference(input.vibeReference);
    } catch (err) {
      logger.warn('Vibe reference translation failed, falling back', {
        error: (err as Error).message,
      });
      vibeDescriptors = input.vibeReference
        .replace(/\b(sound[s]? like|in the style of|similar to|reminiscent of)\b/gi, '')
        .trim()
        .slice(0, 200);
    }
  }
  if (vibeDescriptors) parts.push(`Sonic vibe: ${vibeDescriptors}`);

  if (input.style?.trim()) parts.push(`Style notes: ${input.style.trim()}`);

  if (input.idea?.trim()) parts.push(`Concept: ${input.idea.trim()}`);
  if (input.title?.trim()) parts.push(`Working title: ${input.title.trim()}`);

  return { prompt: parts.join('\n'), vibeDescriptors };
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

    const {
      idea,
      title,
      genre,
      subGenre,
      mood,
      energy,
      era,
      vocalStyle,
      vibeReference,
      style,
      language,
    } = req.body || {};
    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      res.status(400).json({ error: 'idea is required' });
      return;
    }
    if (idea.length > MAX_PROMPT_LEN) {
      res.status(400).json({ error: `idea must be ${MAX_PROMPT_LEN} characters or less` });
      return;
    }

    const lang = typeof language === 'string' ? language : 'English';

    // Orchestrate first: turn raw inputs into a coherent plan that includes a
    // lyricsBrief (theme, perspective, imagery, hooks). The lyrics generator
    // uses that brief as primary direction. Best-effort — fall back to the
    // simple path on failure.
    let plan: OrchestrationPlan | null = null;
    try {
      plan = await minimaxOrchestrate({
        idea,
        title: typeof title === 'string' ? title : null,
        genre: typeof genre === 'string' ? genre : null,
        subGenre: typeof subGenre === 'string' ? subGenre : null,
        mood: typeof mood === 'string' ? mood : null,
        energy: typeof energy === 'string' ? energy : null,
        era: typeof era === 'string' ? era : null,
        vocalStyle: typeof vocalStyle === 'string' ? vocalStyle : null,
        vibeReference: typeof vibeReference === 'string' ? vibeReference : null,
        style: typeof style === 'string' ? style : null,
        isInstrumental: false,
        language: lang,
      });
    } catch (err) {
      logger.warn('Orchestration failed in lyrics path, falling back', {
        error: (err as Error).message,
      });
    }

    // If orchestration didn't supply vibe descriptors, try the standalone
    // translator so we still strip artist names before they reach the lyric
    // model. Both calls are best-effort.
    let vibeDescriptors: string | undefined = plan?.vibeDescriptors || undefined;
    if (!vibeDescriptors && typeof vibeReference === 'string' && vibeReference.trim()) {
      try {
        vibeDescriptors = await minimaxTranslateVibeReference(vibeReference);
      } catch (err) {
        logger.warn('Vibe reference translation failed in lyrics path', {
          error: (err as Error).message,
        });
      }
    }

    const result = await minimaxGenerateLyrics({
      idea: plan?.refinedConcept?.trim() || idea,
      genre: plan?.genre || (typeof genre === 'string' ? genre : undefined),
      subGenre: plan?.subGenre || (typeof subGenre === 'string' ? subGenre : undefined),
      mood: typeof mood === 'string' ? mood : undefined,
      energy: typeof energy === 'string' ? energy : undefined,
      era: typeof era === 'string' ? era : undefined,
      vocalStyle:
        plan?.vocalDirection ||
        (typeof vocalStyle === 'string' ? vocalStyle : undefined),
      vibeDescriptors,
      style: typeof style === 'string' ? style : undefined,
      language: lang,
      lyricsBrief: plan?.lyricsBrief || undefined,
    });

    // Always sanitize: even with the tightened system prompt, models
    // occasionally emit "(strings enter)" or "[Guitar Solo]" lines. Stripping
    // them here guarantees nothing non-singable reaches the music model.
    const sanitized = sanitizeLyrics(result.lyrics);

    res.json({ lyrics: sanitized, plan });
  } catch (error) {
    logger.error('Generate lyrics error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to generate lyrics' });
  }
};

// ─── Music generation (async via background task) ─────────

// Run orchestration + lyric autogeneration as part of background processing
// so the API can return 202 immediately. Mutates the persisted generation row
// when it improves the prompt or fills in auto-generated lyrics. Best-effort:
// if any step fails we log and continue with whatever the user supplied.
async function orchestrateAndPrepareLyrics(gen: {
  id: string;
  prompt: string | null;
  lyrics: string | null;
  isInstrumental: boolean;
  title: string | null;
  genre: string | null;
  subGenre: string | null;
  mood: string | null;
  energy: string | null;
  era: string | null;
  vocalStyle: string | null;
  vibeReference: string | null;
  referenceAudioUrl: string | null;
  providerModel: string | null;
}): Promise<{ prompt: string | null; lyrics: string | null }> {
  // Audio-to-audio cover mode: the music model uses the reference audio for
  // arrangement; orchestration adds little here and a heavy planning prompt
  // can override the user's intent. Skip orchestration in that path.
  const isCover =
    gen.providerModel === 'music-cover' || !!gen.referenceAudioUrl;
  if (isCover) {
    return {
      prompt: gen.prompt,
      lyrics: gen.lyrics ? sanitizeLyrics(gen.lyrics) : null,
    };
  }

  let plan: OrchestrationPlan | null = null;
  try {
    plan = await minimaxOrchestrate({
      idea: gen.prompt,
      title: gen.title,
      genre: gen.genre,
      subGenre: gen.subGenre,
      mood: gen.mood,
      energy: gen.energy,
      era: gen.era,
      vocalStyle: gen.vocalStyle,
      vibeReference: gen.vibeReference,
      isInstrumental: gen.isInstrumental,
    });
  } catch (err) {
    logger.warn('Orchestration failed, proceeding with original prompt', {
      generationId: gen.id,
      error: (err as Error).message,
    });
  }

  // Auto-generate lyrics when the user didn't supply any and the track has
  // vocals. Doing this ourselves (rather than relying on MiniMax's
  // lyrics_optimizer flag) gives us a sanitized, plan-aligned result.
  let nextLyrics = gen.lyrics ? sanitizeLyrics(gen.lyrics) : null;
  if (!gen.isInstrumental && !nextLyrics && plan) {
    try {
      const result = await minimaxGenerateLyrics({
        idea: plan.refinedConcept || gen.prompt || gen.title || 'song',
        genre: plan.genre || gen.genre || undefined,
        subGenre: plan.subGenre || gen.subGenre || undefined,
        mood: gen.mood || undefined,
        energy: gen.energy || undefined,
        era: gen.era || undefined,
        vocalStyle: plan.vocalDirection || gen.vocalStyle || undefined,
        vibeDescriptors: plan.vibeDescriptors || undefined,
        lyricsBrief: plan.lyricsBrief || undefined,
      });
      nextLyrics = sanitizeLyrics(result.lyrics);
    } catch (err) {
      logger.warn('Auto-lyrics from orchestration failed, falling back', {
        generationId: gen.id,
        error: (err as Error).message,
      });
    }
  }

  // Prefer the orchestration's dense music prompt when present.
  const nextPrompt = plan?.musicPrompt?.trim() || gen.prompt;

  // Persist the refined prompt + auto-generated lyrics so the generation row
  // reflects what was actually sent to the music model.
  if (nextPrompt !== gen.prompt || nextLyrics !== gen.lyrics) {
    await prisma.musicGeneration.update({
      where: { id: gen.id },
      data: {
        prompt: nextPrompt,
        lyrics: nextLyrics,
      },
    });
  }

  return { prompt: nextPrompt, lyrics: nextLyrics };
}

async function processMusicGeneration(generationId: string): Promise<void> {
  const gen = await prisma.musicGeneration.findUnique({ where: { id: generationId } });
  if (!gen) return;

  try {
    await prisma.musicGeneration.update({
      where: { id: generationId },
      data: { status: 'PROCESSING' },
    });

    const { prompt: orchestratedPrompt, lyrics: preparedLyrics } =
      await orchestrateAndPrepareLyrics(gen);

    const isCover = gen.providerModel === 'music-cover' || !!gen.referenceAudioUrl;
    const primaryModel =
      gen.providerModel || (isCover ? 'music-cover' : MUSIC_MODEL());
    const baseRequest = {
      prompt: providerPromptForGeneration(orchestratedPrompt, generationId),
      lyrics: preparedLyrics || undefined,
      isInstrumental: gen.isInstrumental,
      audioUrl: gen.referenceAudioUrl || undefined,
      outputFormat: 'url' as const,
    };

    let result;
    let usedModel = primaryModel;
    try {
      result = await minimaxGenerateMusic({ ...baseRequest, model: primaryModel });
    } catch (err) {
      // Cover models cannot fall back to text-to-music — only retry T2M models.
      const fallback = MUSIC_FALLBACK_MODEL();
      if (
        err instanceof MinimaxRateLimitError &&
        !isCover &&
        fallback &&
        fallback !== primaryModel
      ) {
        logger.warn('MiniMax music primary rate-limited, retrying with fallback', {
          generationId,
          primaryModel,
          fallback,
          code: err.code,
        });
        usedModel = fallback;
        result = await minimaxGenerateMusic({ ...baseRequest, model: fallback });
      } else {
        throw err;
      }
    }
    const audioUrl = await audioUrlFromGenerationResult(generationId, result);

    await prisma.musicGeneration.update({
      where: { id: generationId },
      data: {
        status: 'COMPLETED',
        audioUrl,
        providerModel: usedModel,
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
      idea,
      genre,
      subGenre,
      mood,
      energy,
      era,
      vocalStyle,
      vibeReference,
      style,
      durationSec,
      isInstrumental,
      agentId,
    } = req.body || {};

    // For vocal tracks the user can either provide lyrics OR enough hints
    // (prompt/idea/genre) to drive auto-lyrics. When everything is empty
    // we can't generate anything sensible.
    if (!isInstrumental) {
      const hasLyrics = typeof lyrics === 'string' && lyrics.trim().length > 0;
      const hasPrompt = typeof prompt === 'string' && prompt.trim().length > 0;
      const hasIdea = typeof idea === 'string' && idea.trim().length > 0;
      const hasGenre = typeof genre === 'string' && genre.trim().length > 0;
      if (!hasLyrics && !hasPrompt && !hasIdea && !hasGenre) {
        res
          .status(400)
          .json({ error: 'either lyrics, prompt, idea, or genre is required for vocal tracks' });
        return;
      }
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

    // Compose the rich prompt server-side so the structured fields the user
    // picked (subgenre hints, era, vocal style, translated vibe references,
    // etc.) all reach the music model — the client only needs to send raw
    // selections.
    const built = await buildMusicPrompt({
      idea: typeof idea === 'string' ? idea : null,
      title: typeof title === 'string' ? title : null,
      genre: typeof genre === 'string' ? genre : null,
      subGenre: typeof subGenre === 'string' ? subGenre : null,
      mood: typeof mood === 'string' ? mood : null,
      energy: typeof energy === 'string' ? energy : null,
      era: typeof era === 'string' ? era : null,
      vocalStyle: typeof vocalStyle === 'string' ? vocalStyle : null,
      vibeReference: typeof vibeReference === 'string' ? vibeReference : null,
      style: typeof style === 'string' ? style : null,
      isInstrumental: Boolean(isInstrumental),
    });

    // Prefer the server-built prompt; fall back to any client-supplied prompt
    // (older clients or callers that already composed their own).
    const finalPrompt =
      built.prompt.trim() || (typeof prompt === 'string' ? prompt : null);

    // User-supplied lyrics may already contain stage directions (e.g. seeded
    // from another tool). Sanitize at the boundary so the persisted record
    // matches what we'll actually feed the music model.
    const sanitizedLyrics =
      typeof lyrics === 'string' ? sanitizeLyrics(lyrics) || null : null;

    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: typeof agentId === 'string' ? agentId : null,
        title: typeof title === 'string' ? title.slice(0, 200) : null,
        prompt: finalPrompt,
        lyrics: sanitizedLyrics,
        genre: typeof genre === 'string' ? genre.slice(0, 50) : null,
        subGenre: typeof subGenre === 'string' ? subGenre.slice(0, 50) : null,
        mood: typeof mood === 'string' ? mood.slice(0, 50) : null,
        energy: typeof energy === 'string' ? energy.slice(0, 50) : null,
        vocalStyle: typeof vocalStyle === 'string' ? vocalStyle.slice(0, 50) : null,
        era: typeof era === 'string' ? era.slice(0, 50) : null,
        vibeReference: typeof vibeReference === 'string' ? vibeReference.slice(0, 300) : null,
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
        lyrics: source.lyrics ? sanitizeLyrics(source.lyrics) || null : null,
        genre: typeof genre === 'string' ? genre.slice(0, 50) : source.genre,
        subGenre: source.subGenre,
        mood: typeof mood === 'string' ? mood.slice(0, 50) : source.mood,
        energy: source.energy,
        vocalStyle: source.vocalStyle,
        era: source.era,
        vibeReference: source.vibeReference,
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

// ─── Cover art (image-01) ─────────────────────────────────

const ALLOWED_ASPECT_RATIOS = new Set([
  '1:1',
  '16:9',
  '4:3',
  '3:2',
  '2:3',
  '3:4',
  '9:16',
  '21:9',
]);

function buildCoverArtPrompt(input: {
  title?: string | null;
  prompt?: string | null;
  genre?: string | null;
  mood?: string | null;
}): string {
  const bits: string[] = [];
  if (input.title) bits.push(`title: ${input.title}`);
  if (input.genre) bits.push(`genre: ${input.genre}`);
  if (input.mood) bits.push(`mood: ${input.mood}`);
  if (input.prompt) bits.push(`vibe: ${input.prompt.slice(0, 200)}`);
  const ctx = bits.join(', ');
  return (
    `Square album cover artwork for a song${ctx ? ` (${ctx})` : ''}. ` +
    `Striking, contemporary, music-streaming poster design. ` +
    `Bold composition, high contrast, no text, no logos, no watermarks. ` +
    `Cinematic lighting, rich colors.`
  );
}

async function persistMinimaxImage(
  image: { url?: string; base64?: string },
  filename: string
): Promise<string> {
  // Base64: round-trip through Cloudinary (handles data-uri prefix internally).
  if (image.base64) {
    const dataUri = image.base64.startsWith('data:')
      ? image.base64
      : `data:image/png;base64,${image.base64}`;
    const uploaded = await uploadImageBase64(dataUri, 'covers');
    return uploaded.secure_url;
  }
  if (image.url) {
    if (!hasCloudinaryCredentials()) {
      // Provider URLs from MiniMax are temporary, but without Cloudinary we
      // have no choice — surface them as-is and let the caller decide.
      return image.url;
    }
    const res = await fetch(image.url);
    if (!res.ok) throw new Error(`failed to download generated image (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) throw new Error('generated image was empty');
    const uploaded = await uploadCoverArt(buffer, filename);
    return uploaded.secure_url;
  }
  throw new Error('image generation returned no image data');
}

export const generateCoverArt = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { prompt, title, genre, mood, aspectRatio } = req.body || {};
    const promptText =
      typeof prompt === 'string' && prompt.trim().length > 0
        ? prompt.trim()
        : buildCoverArtPrompt({ title, prompt: null, genre, mood });
    if (promptText.length > MAX_PROMPT_LEN) {
      res
        .status(400)
        .json({ error: `prompt must be ${MAX_PROMPT_LEN} characters or less` });
      return;
    }
    const ratio =
      typeof aspectRatio === 'string' && ALLOWED_ASPECT_RATIOS.has(aspectRatio)
        ? (aspectRatio as any)
        : '1:1';

    const result = await minimaxGenerateImage({
      prompt: promptText,
      aspectRatio: ratio,
      n: 1,
      promptOptimizer: true,
      responseFormat: 'url',
    });
    const first = result.images[0];
    if (!first) {
      res.status(502).json({ error: 'Image provider returned no images' });
      return;
    }
    const url = await persistMinimaxImage(first, `cover-${req.user.userId}-${Date.now()}`);
    res.json({ coverArt: url, prompt: promptText });
  } catch (error) {
    if (error instanceof MinimaxRateLimitError) {
      res.status(429).json({ error: 'Image generation quota exhausted, try later' });
      return;
    }
    logger.error('Generate cover art error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to generate cover art' });
  }
};

// ─── Music cover (audio-to-audio) ─────────────────────────

const COVER_PROMPT_MIN = 10;
const COVER_PROMPT_MAX = 300;

export const startMusicCover = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const usage = await assertCanGenerate(req.user.userId);

    const { title, prompt, lyrics, referenceAudioUrl, agentId, genre, mood } =
      req.body || {};

    if (
      !referenceAudioUrl ||
      typeof referenceAudioUrl !== 'string' ||
      !/^https?:\/\//i.test(referenceAudioUrl)
    ) {
      res.status(400).json({ error: 'referenceAudioUrl (https URL) is required' });
      return;
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < COVER_PROMPT_MIN) {
      res
        .status(400)
        .json({ error: `prompt is required (min ${COVER_PROMPT_MIN} characters)` });
      return;
    }
    if (prompt.length > COVER_PROMPT_MAX) {
      res
        .status(400)
        .json({ error: `prompt must be ${COVER_PROMPT_MAX} characters or less` });
      return;
    }
    if (lyrics && typeof lyrics === 'string' && lyrics.length > MAX_LYRICS_LEN) {
      res.status(400).json({ error: `lyrics must be ${MAX_LYRICS_LEN} characters or less` });
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

    const sanitizedCoverLyrics =
      typeof lyrics === 'string' ? sanitizeLyrics(lyrics) || null : null;

    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: typeof agentId === 'string' ? agentId : null,
        title: typeof title === 'string' ? title.slice(0, 200) : null,
        prompt: prompt.trim(),
        lyrics: sanitizedCoverLyrics,
        genre: typeof genre === 'string' ? genre.slice(0, 50) : null,
        mood: typeof mood === 'string' ? mood.slice(0, 50) : null,
        isInstrumental: false,
        referenceAudioUrl,
        provider: 'minimax',
        providerModel: 'music-cover',
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
    logger.error('Start music cover error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start music cover' });
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

    const { title, prompt, imageRefUrl, resolution, duration } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    if (prompt.length > MAX_PROMPT_LEN) {
      res.status(400).json({ error: `prompt must be ${MAX_PROMPT_LEN} characters or less` });
      return;
    }
    const validResolutions = new Set(['720P', '768P', '1080P']);
    const reqResolution = validResolutions.has(resolution) ? (resolution as any) : '768P';
    const reqDuration = duration === 10 ? 10 : 6;

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
        resolution: reqResolution,
        duration: reqDuration,
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

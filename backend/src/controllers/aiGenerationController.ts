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
  lookupGenreHint,
  lookupMoodHint,
  lookupEnergyHint,
  lookupVocalStyleHint,
  lookupEraHint,
  lookupLyricConvention,
  lookupVisualConvention,
} from '../utils/musicCatalog';
import { assertCanGenerate, getDailyUsage } from '../utils/aiUsage';
import { slugify, uniqueSuffix, createWithUniqueSlug } from '../utils/slugify';
import { uploadAudio, uploadImageBase64, uploadCoverArt } from '../utils/cloudinary';
import { moderateLyrics, moderationToError } from '../utils/moderation';
import { computeAndPersistTrackFeatures } from '../utils/recommendations';
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
  bpm?: number | null;
  key?: string | null;
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

  // Subgenre hint takes precedence; fall back to primary-genre hint when no
  // subgenre was selected so e.g. "Rock" still gets production cues.
  const productionHint =
    lookupSubgenreHint(input.subGenre) || lookupGenreHint(input.genre);
  if (productionHint) parts.push(`Production: ${productionHint}`);

  if (input.mood) {
    const moodHint = lookupMoodHint(input.mood);
    parts.push(`Mood: ${input.mood}${moodHint ? ` (${moodHint})` : ''}`);
  }

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

  // BPM and key are passed through the prompt rather than as separate fields
  // so we don't need a schema change. MiniMax respects these as constraints.
  if (typeof input.bpm === 'number' && input.bpm > 0) {
    parts.push(`Tempo: ${input.bpm} BPM`);
  }
  if (input.key?.trim()) parts.push(`Key: ${input.key.trim()}`);

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

    const lyricGenre = plan?.genre || (typeof genre === 'string' ? genre : undefined);
    const lyricSubGenre =
      plan?.subGenre || (typeof subGenre === 'string' ? subGenre : undefined);
    const convention = lookupLyricConvention(lyricGenre || null, lyricSubGenre || null);

    const result = await minimaxGenerateLyrics({
      idea: plan?.refinedConcept?.trim() || idea,
      genre: lyricGenre,
      subGenre: lyricSubGenre,
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
      hookLine: plan?.hookLine || undefined,
      conventionRhyme: convention?.rhyme,
      conventionVoice: convention?.voice,
      conventionStructure: convention?.structure,
      conventionLengthHint: convention?.lengthHint,
    });

    // Always sanitize: even with the tightened system prompt, models
    // occasionally emit "(strings enter)" or "[Guitar Solo]" lines. Stripping
    // them here guarantees nothing non-singable reaches the music model.
    const sanitized = sanitizeLyrics(result.lyrics);
    // Tight loop: if the model produces obviously out-of-policy content
    // (rare with the system prompt, but possible on adversarial inputs),
    // refuse to surface it. The /v1/lyrics endpoint is unauthenticated for
    // dashboard users but rate-limited, so this is the right place to
    // gate.
    if (sanitized) {
      const check = moderateLyrics(sanitized);
      if (!check.allowed && check.severity === 'BLOCK') {
        res.status(400).json({ error: 'Generated content violates content policy. Try a different prompt.' });
        return;
      }
    }

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
      const autoGenre = plan.genre || gen.genre || undefined;
      const autoSubGenre = plan.subGenre || gen.subGenre || undefined;
      const autoConvention = lookupLyricConvention(
        autoGenre || null,
        autoSubGenre || null
      );
      const result = await minimaxGenerateLyrics({
        idea: plan.refinedConcept || gen.prompt || gen.title || 'song',
        genre: autoGenre,
        subGenre: autoSubGenre,
        mood: gen.mood || undefined,
        energy: gen.energy || undefined,
        era: gen.era || undefined,
        vocalStyle: plan.vocalDirection || gen.vocalStyle || undefined,
        vibeDescriptors: plan.vibeDescriptors || undefined,
        lyricsBrief: plan.lyricsBrief || undefined,
        hookLine: plan.hookLine || undefined,
        conventionRhyme: autoConvention?.rhyme,
        conventionVoice: autoConvention?.voice,
        conventionStructure: autoConvention?.structure,
        conventionLengthHint: autoConvention?.lengthHint,
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
      bpm,
      key,
    } = req.body || {};

    // Validate optional bpm/key inputs.
    const bpmVal =
      typeof bpm === 'number' && Number.isFinite(bpm) && bpm >= 40 && bpm <= 240
        ? Math.round(bpm)
        : null;
    const keyVal = typeof key === 'string' && key.trim().length <= 20 ? key.trim() || null : null;

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

    // Persona: when an agent is supplied and has a locked genConfig, fill in
    // any unspecified fields from the persona. This gives every track under
    // the same agent a consistent voice/era/vibe — the user can still
    // override on a per-track basis by passing the field explicitly.
    const personaPatch: Partial<Record<string, string>> = {};
    if (agentId) {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        select: { id: true, ownerId: true, genConfig: true },
      });
      if (!agent || agent.ownerId !== req.user.userId) {
        res.status(403).json({ error: 'You do not own this agent' });
        return;
      }
      const cfg = (agent.genConfig as any) || {};
      const PERSONA_FIELDS = ['genre', 'subGenre', 'mood', 'energy', 'era', 'vocalStyle', 'vibeReference', 'style'] as const;
      for (const f of PERSONA_FIELDS) {
        if (typeof cfg[f] === 'string' && cfg[f].trim()) {
          personaPatch[f] = cfg[f];
        }
      }
    }
    const personaPick = (raw: unknown, key: keyof typeof personaPatch): string | null => {
      if (typeof raw === 'string' && raw.trim()) return raw;
      return personaPatch[key] || null;
    };

    // Compose the rich prompt server-side so the structured fields the user
    // picked (subgenre hints, era, vocal style, translated vibe references,
    // etc.) all reach the music model — the client only needs to send raw
    // selections. Persona-locked fields fill in any gaps.
    const built = await buildMusicPrompt({
      idea: typeof idea === 'string' ? idea : null,
      title: typeof title === 'string' ? title : null,
      genre: personaPick(genre, 'genre'),
      subGenre: personaPick(subGenre, 'subGenre'),
      mood: personaPick(mood, 'mood'),
      energy: personaPick(energy, 'energy'),
      era: personaPick(era, 'era'),
      vocalStyle: personaPick(vocalStyle, 'vocalStyle'),
      vibeReference: personaPick(vibeReference, 'vibeReference'),
      style: personaPick(style, 'style'),
      isInstrumental: Boolean(isInstrumental),
      bpm: bpmVal,
      key: keyVal,
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

    // Moderate user lyrics BEFORE billing a generation slot or sending to the
    // provider. CSAM / threat patterns must never reach the music model.
    if (sanitizedLyrics) {
      const check = moderateLyrics(sanitizedLyrics);
      const err = moderationToError(check);
      if (err && check.severity === 'BLOCK') {
        res.status(400).json({ error: err });
        return;
      }
    }

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

    // Pre-publish moderation. Lyrics that contain slurs / threats / CSAM
    // patterns are blocked with a clear error so the creator can edit and
    // try again. Allowed-with-flag generations (REVIEW severity) still get
    // through here but are visible to admins via the existing report flow.
    const lyricsCheck = moderateLyrics(gen.lyrics);
    if (!lyricsCheck.allowed || lyricsCheck.severity === 'REVIEW') {
      const message = moderationToError(lyricsCheck);
      logger.warn('Publish blocked by moderation', {
        generationId: gen.id,
        severity: lyricsCheck.severity,
        reasons: lyricsCheck.reasons,
      });
      res.status(400).json({ error: message });
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

    const seedSlug = slugify(finalTitle, 80) || `track-${uniqueSuffix()}`;

    // Slug uniqueness via P2002 retry. We also re-check `gen.trackId === null`
    // inside the transaction so two concurrent publish requests for the same
    // generation can't both create a track. The conditional update at the
    // end fails with P2025 if another request beat us; we surface that as a
    // 409 Conflict.
    const created = await createWithUniqueSlug(seedSlug, (slug) =>
      prisma.$transaction(async (tx) => {
        const fresh = await tx.musicGeneration.findUnique({
          where: { id: gen.id },
          select: { trackId: true },
        });
        if (!fresh) throw new Error('Generation disappeared');
        if (fresh.trackId) {
          const dupErr: any = new Error('Generation already published');
          dupErr.code = 'ALREADY_PUBLISHED';
          throw dupErr;
        }

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

        // Conditional update — `updateMany` so we can include trackId in
        // the filter. Returns count = 0 if another concurrent publish beat
        // us to it; we treat that as a duplicate-publish race.
        const r = await tx.musicGeneration.updateMany({
          where: { id: gen.id, trackId: null },
          data: { trackId: track.id, agentId: agent.id },
        });
        if (r.count === 0) {
          const dupErr: any = new Error('Generation already published');
          dupErr.code = 'ALREADY_PUBLISHED';
          throw dupErr;
        }

        return track;
      })
    ).catch((err) => {
      if (err?.code === 'ALREADY_PUBLISHED' || err?.code === 'P2025') {
        return null;
      }
      throw err;
    });

    if (!created) {
      res.status(409).json({ error: 'Generation already published' });
      return;
    }

    // Best-effort: compute feature vector for recommendations. We do this
    // outside the transaction so a hiccup here doesn't fail the publish.
    computeAndPersistTrackFeatures(created.id).catch((err) => {
      logger.warn('Feature vector compute failed', {
        trackId: created.id,
        error: (err as Error).message,
      });
    });

    // Best-effort: kick off a 6s vertical preview video using Hailuo if
    // the env is configured. This is what Instagram/TikTok shares will
    // post. The cron poller picks up the resulting URL and writes it back
    // to Track.previewVideoUrl. Failure is non-fatal.
    if (process.env.AUTO_PREVIEW_VIDEO === '1' && created.coverArt) {
      void minimaxStartVideo({
        prompt: `Vertical music-video promo for "${created.title}" — animated cover art, subtle camera move, high contrast, 9:16.`,
        firstFrameImage: created.coverArt,
        resolution: '768P',
        duration: 6,
      })
        .then(async (start) => {
          await prisma.videoGeneration.create({
            data: {
              userId: req.user!.userId,
              title: `Preview: ${created.title}`,
              prompt: 'auto-preview',
              purpose: 'preview',
              trackId: created.id,
              durationSec: 6,
              resolution: '768P',
              providerJobId: start.taskId,
              status: 'PROCESSING',
            },
          });
        })
        .catch((err) => {
          logger.warn('Auto preview video failed', { trackId: created.id, error: (err as Error).message });
        });
    }

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
  subGenre?: string | null;
  mood?: string | null;
  energy?: string | null;
  era?: string | null;
}): string {
  // Pull a genre-specific visual language block from the catalog. Falls back
  // to a neutral cinematic-poster aesthetic if no genre/subgenre matches —
  // way better than the previous one-size-fits-all "cinematic lighting, rich
  // colors" prompt that actively hurt grunge/lofi/black-metal aesthetics.
  const visual = lookupVisualConvention(input.genre || null, input.subGenre || null);

  const lines: string[] = [];
  lines.push(
    `Album cover artwork (square 1:1) for a${input.genre ? ` ${input.genre.toLowerCase()}` : ''} song${
      input.title ? ` titled "${input.title}"` : ''
    }${input.mood ? `, ${input.mood.toLowerCase()} mood` : ''}.`
  );

  if (visual) {
    lines.push(`Palette: ${visual.palette}.`);
    lines.push(`Composition: ${visual.composition}.`);
    lines.push(`Visual motifs: ${visual.motifs}.`);
    lines.push(`Texture / finish: ${visual.texture}.`);
    lines.push(`Lighting: ${visual.lighting}.`);
  } else {
    // Neutral fallback — only used if genre is absent/unrecognized.
    lines.push(
      `Striking contemporary album-cover composition, balanced negative space, evocative single subject.`
    );
  }

  // Era cue, only when meaningful for visual styling.
  if (input.era && input.era !== 'Modern' && input.era !== 'Timeless') {
    lines.push(`Era cue: ${input.era} visual aesthetic.`);
  }

  // Free-text user vibe goes in last so the genre frame sets the baseline and
  // the user can tilt it further. Cap at 220 chars to leave headroom.
  if (input.prompt?.trim()) {
    lines.push(`Additional vibe: ${input.prompt.trim().slice(0, 220)}.`);
  }

  // Hard guardrails for streaming-platform covers. These are universal — no
  // text overlays (the title is rendered by the player UI), no watermarks,
  // no logos, no real recognizable celebrity faces.
  lines.push(
    `Constraints: NO text, NO typography, NO letters or numbers, NO logos, NO watermarks. ` +
      `Do NOT include real celebrity faces or copyrighted characters. Composition must work as a tiny ` +
      `streaming thumbnail and as a poster.`
  );

  return lines.join(' ');
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

    const { prompt, title, genre, subGenre, mood, energy, era, aspectRatio } =
      req.body || {};
    // Always run the structured builder when we have *any* genre/mood context,
    // even if the user supplied a free-text prompt — we wrap their prompt as
    // an additional vibe inside the genre-aware frame. If they explicitly want
    // raw control, they can pass an opaque prompt with no genre.
    const hasGenreContext =
      typeof genre === 'string' || typeof subGenre === 'string' || typeof mood === 'string';
    const promptText =
      typeof prompt === 'string' && prompt.trim().length > 0 && !hasGenreContext
        ? prompt.trim()
        : buildCoverArtPrompt({
            title,
            prompt: typeof prompt === 'string' ? prompt : null,
            genre,
            subGenre,
            mood,
            energy,
            era,
          });
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
    if (sanitizedCoverLyrics) {
      const check = moderateLyrics(sanitizedCoverLyrics);
      const err = moderationToError(check);
      if (err && check.severity === 'BLOCK') {
        res.status(400).json({ error: err });
        return;
      }
    }

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

// ─── Section regeneration ─────────────────────────────────
//
// Re-renders a single section (e.g. "Verse 2", "Chorus") of a published
// track or completed generation, then issues a new music generation that
// uses the patched lyrics. The new generation lineage links back via
// MusicGeneration referencing the original — and on publish the resulting
// Track sets parentTrackId so the lineage is queryable.

export const regenerateSection = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const sourceId = req.params.id as string;
    const { section, instructions } = req.body || {};
    if (!section || typeof section !== 'string') {
      res.status(400).json({ error: 'section is required (e.g. "Chorus", "Verse 2")' });
      return;
    }

    const source = await prisma.musicGeneration.findUnique({ where: { id: sourceId } });
    if (!source || source.userId !== req.user.userId) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    if (!source.lyrics) {
      res.status(400).json({ error: 'Source has no section-tagged lyrics to regenerate' });
      return;
    }

    const usage = await assertCanGenerate(req.user.userId);

    // Lazy-import to avoid a circular dep with utils.
    const { findSection, replaceSection } = await import('../utils/lyricsSections');
    const target = findSection(source.lyrics, section);
    if (!target) {
      res.status(400).json({ error: `Section "${section}" not found in lyrics` });
      return;
    }

    // Generate new section text using the model. We feed surrounding
    // sections as context so the rewrite stays thematically coherent. Genre /
    // mood context goes in the system prompt so the rewrite stays inside the
    // song's stylistic frame instead of drifting toward a generic pop register.
    const surrounding =
      source.lyrics.slice(0, target.start) +
      '\n[REWRITE_HERE]\n' +
      source.lyrics.slice(target.end);
    const sectionConvention = lookupLyricConvention(source.genre, source.subGenre);
    const styleContext: string[] = [];
    if (source.genre || source.subGenre) {
      styleContext.push(
        `Genre: ${[source.genre, source.subGenre].filter(Boolean).join(' / ')}`
      );
    }
    if (source.mood) styleContext.push(`Mood: ${source.mood}`);
    if (source.energy) styleContext.push(`Energy: ${source.energy}`);
    if (source.era) styleContext.push(`Era: ${source.era}`);
    if (source.vibeReference) styleContext.push(`Vibe: ${source.vibeReference}`);
    if (sectionConvention?.rhyme) styleContext.push(`Rhyme/meter: ${sectionConvention.rhyme}`);
    if (sectionConvention?.voice) styleContext.push(`Voice: ${sectionConvention.voice}`);
    const styleBlock = styleContext.length
      ? `\n\nSong style frame (must stay inside this):\n${styleContext.join('\n')}`
      : '';

    const sysPrompt =
      `You are rewriting a single section of an existing song. Output ONLY the new lyrics for the ${target.tag} section. ` +
      `Match the existing meter, rhyme scheme, and theme. Stay inside the song's genre/mood/voice frame supplied below. ` +
      `Do NOT include the section tag itself. Do NOT include other sections. Keep length similar to the original. ` +
      `Do NOT include parenthetical stage directions, instrument cues, or [Guitar Solo]-style tags — output only sing-able lyrics.${styleBlock}`;
    const userPrompt =
      `Existing song with the section to rewrite marked [REWRITE_HERE]:\n\n${surrounding}\n\n` +
      (typeof instructions === 'string' && instructions.trim()
        ? `Rewrite directions: ${instructions.trim()}\n\n`
        : '') +
      `Output the new ${target.tag} body only.`;

    const { minimaxChat } = await import('../utils/minimax');
    const chat = await minimaxChat({
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 600,
      temperature: 0.85,
    });

    const newBody = sanitizeLyrics(chat.text.trim());
    if (!newBody) {
      res.status(502).json({ error: 'Section rewrite returned empty content' });
      return;
    }

    // Moderate the rewritten section + the rewrite directions before
    // accepting. Direction text from the user is the most likely vector for
    // injecting policy-violating content.
    const directions = typeof instructions === 'string' ? instructions : '';
    for (const t of [newBody, directions]) {
      if (!t) continue;
      const check = moderateLyrics(t);
      const err = moderationToError(check);
      if (err && check.severity === 'BLOCK') {
        res.status(400).json({ error: err });
        return;
      }
    }

    const patched = replaceSection(source.lyrics, section, newBody);

    // Spawn a new music generation seeded with the patched lyrics. The
    // existing background processor will pick it up via the same path.
    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: source.agentId,
        title: source.title,
        prompt: source.prompt,
        lyrics: patched,
        genre: source.genre,
        subGenre: source.subGenre,
        mood: source.mood,
        energy: source.energy,
        vocalStyle: source.vocalStyle,
        era: source.era,
        vibeReference: source.vibeReference,
        durationSec: source.durationSec,
        isInstrumental: source.isInstrumental,
        provider: source.provider,
        providerModel: source.providerModel || MUSIC_MODEL(),
        status: 'PENDING',
      },
    });
    void processMusicGeneration(generation.id);
    res.status(202).json({ generation, usage: { ...usage, remaining: usage.remaining - 1 }, patchedLyrics: patched });
  } catch (error) {
    const statusCode = (error as any).statusCode;
    if (statusCode === 429) {
      res.status(429).json({ error: (error as Error).message, usage: (error as any).usage });
      return;
    }
    logger.error('regenerateSection error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to regenerate section' });
  }
};

// ─── Song extension (continue track) ──────────────────────
//
// Generates a continuation of an existing track using MiniMax cover mode:
// the existing audio is fed in as the audio reference, prompted to extend
// for ~30-60 more seconds. The two audio files are stitched client-side
// for now (server-side ffmpeg stitching is a follow-up).

export const extendGeneration = async (req: RequestWithUser, res: Response) => {
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
    if (!source.audioUrl) {
      res.status(400).json({ error: 'Source generation has no audio to extend' });
      return;
    }

    const usage = await assertCanGenerate(req.user.userId);

    const { extraLyrics, instructions } = req.body || {};

    // Compose the extension prompt. We tell the model to continue from where
    // the source left off rather than restart, and pin lyrics if supplied.
    // Carry the original track's genre / mood / era / vibe so the music model
    // doesn't drift into a generic continuation that loses the source style.
    const extContext: string[] = [];
    if (source.genre || source.subGenre) {
      extContext.push(
        `Genre: ${[source.genre, source.subGenre].filter(Boolean).join(' / ')}`
      );
    }
    const extProductionHint =
      lookupSubgenreHint(source.subGenre) || lookupGenreHint(source.genre);
    if (extProductionHint) extContext.push(`Production: ${extProductionHint}`);
    if (source.mood) extContext.push(`Mood: ${source.mood}`);
    if (source.energy) extContext.push(`Energy: ${source.energy}`);
    if (source.era) extContext.push(`Era: ${source.era}`);
    if (source.vibeReference) extContext.push(`Vibe: ${source.vibeReference}`);

    const continuationPrompt =
      `Continue this track: keep the same key, tempo, instrumentation, and vocal character as the reference audio. ` +
      `Pick up where the reference audio leaves off and extend for another 30-60 seconds. Maintain the same arrangement density and energy arc — do not reset to a sparse intro.` +
      (extContext.length ? `\n${extContext.join('\n')}` : '') +
      (typeof instructions === 'string' && instructions.trim()
        ? `\nDirection: ${instructions.trim()}`
        : '');

    const sanitizedExtraLyrics =
      typeof extraLyrics === 'string' && extraLyrics.trim()
        ? sanitizeLyrics(extraLyrics)
        : null;
    if (sanitizedExtraLyrics) {
      const check = moderateLyrics(sanitizedExtraLyrics);
      const err = moderationToError(check);
      if (err && check.severity === 'BLOCK') {
        res.status(400).json({ error: err });
        return;
      }
    }
    const generation = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId: source.agentId,
        title: source.title ? `${source.title} (extended)` : 'Extension',
        prompt: continuationPrompt,
        lyrics: sanitizedExtraLyrics,
        genre: source.genre,
        subGenre: source.subGenre,
        mood: source.mood,
        energy: source.energy,
        vocalStyle: source.vocalStyle,
        era: source.era,
        vibeReference: source.vibeReference,
        durationSec: source.durationSec,
        isInstrumental: source.isInstrumental,
        referenceAudioUrl: source.audioUrl,
        provider: source.provider,
        // Cover model is what conditions on the reference audio.
        providerModel: 'music-cover',
        status: 'PENDING',
      },
    });
    void processMusicGeneration(generation.id);
    res.status(202).json({ generation, usage: { ...usage, remaining: usage.remaining - 1 } });
  } catch (error) {
    const statusCode = (error as any).statusCode;
    if (statusCode === 429) {
      res.status(429).json({ error: (error as Error).message, usage: (error as any).usage });
      return;
    }
    logger.error('extendGeneration error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to extend generation' });
  }
};

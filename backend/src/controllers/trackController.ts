import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { slugify, createWithUniqueSlug } from '../utils/slugify';

export const createTrack = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { title, agentId, audioUrl, coverArt, duration, genreId, mood, tags, bpm, key, aiModel, aiPrompt, videoUrl, videoThumbnail, isPublic, lyrics } = req.body;

    if (!title || !agentId || !audioUrl || !duration) {
      res.status(400).json({ error: 'Title, agentId, audioUrl, and duration are required' });
      return;
    }

    // Verify agent ownership
    const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    if (agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const seedSlug = slugify(title);

    const parsedDuration = parseInt(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      res.status(400).json({ error: 'Duration must be a positive number' }); return;
    }
    const parsedBpm = bpm ? parseInt(bpm) : null;
    if (parsedBpm !== null && (isNaN(parsedBpm) || parsedBpm <= 0)) {
      res.status(400).json({ error: 'BPM must be a positive number' }); return;
    }

    // Slug uniqueness via P2002 retry — atomic, no TOCTOU window.
    const track = await createWithUniqueSlug(seedSlug, (slug) =>
      prisma.track.create({
        data: {
          title,
          slug,
          audioUrl,
          coverArt,
          duration: parsedDuration,
          mood,
          tags: tags || [],
          bpm: parsedBpm,
          key,
          aiModel,
          aiPrompt,
          lyrics: typeof lyrics === 'string' ? lyrics : null,
          status: 'ACTIVE',
          isPublic: isPublic === false ? false : true,
          agentId,
          genreId: genreId || null,
          ...(videoUrl && {
            video: { create: { videoUrl, thumbnail: videoThumbnail } },
          }),
        },
        include: {
          agent: { select: { id: true, name: true, slug: true, avatar: true } },
          genre: true,
          video: true,
        },
      })
    );

    res.status(201).json({ track });
  } catch (error) {
    logger.error('Create track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create track' });
  }
};

export const getTrack = async (req: RequestWithUser, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;

    const track = await prisma.track.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'ACTIVE' },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true, ownerId: true } },
        genre: true,
        video: true,
        _count: { select: { likes: true, comments: true, plays: true } },
      },
    });

    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }

    // Respect privacy: private tracks are only visible to their owner + admins
    if (!track.isPublic) {
      const isOwner = req.user && track.agent.ownerId === req.user.userId;
      const isAdmin = req.user && req.user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
    }
    // Hide tracks under DMCA review from non-owners (consistent with the
    // takedown policy of "hide while pending"). Owners still see the page so
    // they can counter-notice.
    if (track.takedownStatus) {
      const isOwner = req.user && track.agent.ownerId === req.user.userId;
      const isAdmin = req.user && req.user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
    }

    let isLiked = false;
    if (req.user) {
      const like = await prisma.like.findUnique({
        where: { userId_trackId: { userId: req.user.userId, trackId: track.id } },
      });
      isLiked = !!like;
    }

    res.json({ track: { ...track, isLiked } });
  } catch (error) {
    logger.error('Get track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get track' });
  }
};

export const listTracks = async (req: RequestWithUser, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const VALID_SORTS = ['newest', 'popular', 'liked'] as const;
    type SortKey = (typeof VALID_SORTS)[number];
    const rawSort = (req.query.sort as string) || 'newest';
    const sort: SortKey = (VALID_SORTS as readonly string[]).includes(rawSort)
      ? (rawSort as SortKey)
      : 'newest';
    const genreSlug = req.query.genre as string | undefined;
    const agentId = req.query.agentId as string | undefined;
    const mood = req.query.mood as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = { status: 'ACTIVE', isPublic: true, takedownStatus: null };
    if (genreSlug) where.genre = { slug: genreSlug };
    if (agentId) where.agentId = agentId;
    if (mood && mood.trim().length > 0) {
      // Case-insensitive: ?mood=Happy must match stored "happy". Cap length
      // to keep ILIKE scans bounded.
      where.mood = { equals: mood.trim().slice(0, 50), mode: 'insensitive' };
    }
    if (search && search.trim().length > 0) {
      // Cap search length to keep DB ILIKE scans bounded
      where.title = { contains: search.trim().slice(0, 100), mode: 'insensitive' };
    }

    const orderBy: any = sort === 'popular' ? { playCount: 'desc' }
      : sort === 'liked' ? { likeCount: 'desc' }
      : { createdAt: 'desc' };

    // Explicit select — list endpoints don't need `lyrics` (multi-KB Text),
    // `aiPrompt` (up to 2KB), `featureVector` (Float[] used only by the
    // recommender), or `takedownReason` (admin-only). Cutting these from
    // the wire response shrinks payloads ~5–10x on big catalogs.
    const trackListSelect = {
      id: true,
      title: true,
      slug: true,
      duration: true,
      audioUrl: true,
      coverArt: true,
      status: true,
      isPublic: true,
      mood: true,
      tags: true,
      bpm: true,
      key: true,
      aiModel: true,
      playCount: true,
      likeCount: true,
      shareCount: true,
      trendingScore: true,
      licenseable: true,
      licensePriceCents: true,
      licenseCurrency: true,
      takedownStatus: true,
      previewVideoUrl: true,
      createdAt: true,
      updatedAt: true,
      agentId: true,
      genreId: true,
      albumId: true,
      parentTrackId: true,
      agent: { select: { id: true, name: true, slug: true, avatar: true } },
      genre: true,
      video: { select: { id: true } },
    } as const;

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        select: trackListSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.track.count({ where }),
    ]);

    res.json({ tracks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('List tracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list tracks' });
  }
};

// List tracks owned by the current user (across all their agents).
// Use visibility=private|public|all to filter.
export const listMyTracks = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const visibility = (req.query.visibility as string) || 'all';

    const where: any = {
      agent: { ownerId: req.user.userId },
    };
    if (visibility === 'private') where.isPublic = false;
    if (visibility === 'public') where.isPublic = true;

    // Owners see their own list — drop the same heavy fields as the public
    // listing. Lyrics are loaded on the detail page when needed.
    const myTrackSelect = {
      id: true,
      title: true,
      slug: true,
      duration: true,
      audioUrl: true,
      coverArt: true,
      status: true,
      isPublic: true,
      mood: true,
      tags: true,
      bpm: true,
      key: true,
      aiModel: true,
      playCount: true,
      likeCount: true,
      shareCount: true,
      trendingScore: true,
      licenseable: true,
      licensePriceCents: true,
      licenseCurrency: true,
      takedownStatus: true,
      previewVideoUrl: true,
      createdAt: true,
      updatedAt: true,
      agentId: true,
      genreId: true,
      albumId: true,
      parentTrackId: true,
      agent: { select: { id: true, name: true, slug: true, avatar: true } },
      genre: true,
    } as const;

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        select: myTrackSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.track.count({ where }),
    ]);

    res.json({ tracks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('List my tracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list your tracks' });
  }
};

const VALID_REPORT_REASONS = [
  'copyright',
  'harassment',
  'hate-speech',
  'sexual-content',
  'spam',
  'violence',
  'misinformation',
  'other',
] as const;

export const reportTrack = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const trackId = req.params.id as string;
    const { reason, notes } = req.body || {};

    if (!reason || typeof reason !== 'string' || !VALID_REPORT_REASONS.includes(reason as any)) {
      res.status(400).json({
        error: `reason must be one of: ${VALID_REPORT_REASONS.join(', ')}`,
      });
      return;
    }
    if (notes && typeof notes === 'string' && notes.length > 1000) {
      res.status(400).json({ error: 'notes must be 1000 characters or less' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, title: true, status: true },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    // Prevent duplicate pending reports from the same user
    const existing = await prisma.report.findFirst({
      where: { trackId, userId: req.user.userId, status: 'PENDING' },
    });
    if (existing) {
      res.json({ message: 'Already reported. Our moderators will review it.' });
      return;
    }

    await prisma.report.create({
      data: {
        trackId,
        userId: req.user.userId,
        reason,
        notes: typeof notes === 'string' ? notes.trim() : null,
      },
    });

    res.status(201).json({ message: 'Report submitted. Thanks for helping keep MakeYourMusic safe.' });
  } catch (error) {
    logger.error('Report track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

export const updateTrackVisibility = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const id = req.params.id as string;
    const { isPublic } = req.body || {};
    if (typeof isPublic !== 'boolean') {
      res.status(400).json({ error: 'isPublic must be a boolean' });
      return;
    }
    const track = await prisma.track.findUnique({
      where: { id },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (track.agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }
    const updated = await prisma.track.update({
      where: { id },
      data: { isPublic },
    });
    res.json({ track: updated });
  } catch (error) {
    logger.error('Update track visibility error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update visibility' });
  }
};

// Update an existing track's cover art. Used for backfilling covers when the
// original publish step shipped without one (e.g. cover-art provider was
// down). Owner-only, validates the URL is https + on a known image host so
// we can't be tricked into pointing tracks at arbitrary attacker-controlled
// content.
const COVER_HOST_ALLOWLIST = [
  /\.cloudinary\.com$/i,
  /\.minimax\.io$/i,
  /\.minimaxi\.com$/i,
  /\.aliyuncs\.com$/i,
];

export const updateTrackCover = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const id = req.params.id as string;
    const { coverArt } = req.body || {};
    if (typeof coverArt !== 'string' || !coverArt.trim()) {
      res.status(400).json({ error: 'coverArt must be a non-empty string' });
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(coverArt);
    } catch {
      res.status(400).json({ error: 'coverArt must be a valid URL' });
      return;
    }
    if (parsed.protocol !== 'https:') {
      res.status(400).json({ error: 'coverArt must use https' });
      return;
    }
    const host = parsed.hostname.toLowerCase();
    if (!COVER_HOST_ALLOWLIST.some((re) => re.test(host))) {
      res.status(400).json({ error: 'coverArt host is not on the allowlist' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (track.agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }
    const updated = await prisma.track.update({
      where: { id },
      data: { coverArt: parsed.toString() },
    });
    res.json({ track: updated });
  } catch (error) {
    logger.error('Update track cover error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update cover' });
  }
};

// Minimum seconds-of-audio that count toward playCount (Spotify-style).
// Plays under this threshold still get a Play row (useful for analytics)
// but don't pump the denormalized counters or trending score.
const PLAY_COUNT_THRESHOLD_SEC = 30;

// Per-track de-dup window — same (trackId, viewer) within this window
// only gets one play. Hard cap on the most obvious pump attack.
const PLAY_DEDUP_WINDOW_MS = 60_000;
const MAX_RECENT_PLAYS = 5000;
const recentPlays = new Map<string, number>();
let recentPlaysCleanupScheduled = false;

function cleanupStalePlays(now: number): void {
  if (recentPlays.size === 0) return;
  for (const [k, t] of recentPlays.entries()) {
    if (now - t > PLAY_DEDUP_WINDOW_MS) recentPlays.delete(k);
  }
}

function shouldDedupPlay(key: string): boolean {
  const now = Date.now();
  const last = recentPlays.get(key);
  if (last && now - last < PLAY_DEDUP_WINDOW_MS) return true;
  recentPlays.set(key, now);
  if (recentPlays.size > MAX_RECENT_PLAYS && !recentPlaysCleanupScheduled) {
    recentPlaysCleanupScheduled = true;
    setImmediate(() => {
      cleanupStalePlays(Date.now());
      recentPlaysCleanupScheduled = false;
    });
  }
  return false;
}

export const recordPlay = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const { durationPlayed, completed } = req.body || {};

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { agent: { select: { ownerId: true } } },
    });
    if (!track || track.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    // Private tracks: only the owner can record plays
    if (!track.isPublic) {
      if (!req.user || track.agent.ownerId !== req.user.userId) {
        res.status(404).json({ error: 'Track not found' });
        return;
      }
    }

    // Self-plays by the track's own agent owner shouldn't pump counters.
    const isSelfPlay =
      req.user?.userId !== undefined && req.user.userId === track.agent.ownerId;

    // Clamp duration so a malicious client can't pass `durationPlayed: 999999`
    // — only durations within track length + small slack make sense.
    const rawDuration = typeof durationPlayed === 'number' ? durationPlayed : parseInt(String(durationPlayed || 0), 10);
    const clampedDuration = Math.max(
      0,
      Math.min(track.duration + 5, Number.isFinite(rawDuration) ? rawDuration : 0)
    );
    const isCompleted = completed === true || completed === 'true';

    // Dedup key — userId if logged in, else IP.
    const dedupId = req.user?.userId || req.ip || 'anon';
    const isDuplicate = shouldDedupPlay(`${trackId}:${dedupId}`);

    // Always create a Play row for analytics, but only bump counters/trending
    // when the listen meets the threshold AND isn't self-play AND isn't a
    // dedup hit.
    const shouldCount =
      !isSelfPlay &&
      !isDuplicate &&
      (clampedDuration >= PLAY_COUNT_THRESHOLD_SEC || isCompleted);

    const ops: any[] = [
      prisma.play.create({
        data: {
          trackId,
          userId: req.user?.userId || null,
          durationPlayed: clampedDuration,
          completed: isCompleted,
        },
      }),
    ];
    if (shouldCount) {
      ops.push(
        prisma.track.update({
          where: { id: trackId },
          data: { playCount: { increment: 1 } },
        }),
        prisma.aiAgent.update({
          where: { id: track.agentId },
          data: { totalPlays: { increment: 1 } },
        })
      );
    }
    await prisma.$transaction(ops);

    res.json({ message: 'Play recorded', counted: shouldCount });
  } catch (error) {
    logger.error('Record play error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to record play' });
  }
};

// Records that a logged-in user saved a track for offline playback. The
// (userId, trackId) tuple is unique, so re-downloads are idempotent and
// downloadCount only increments on first save per user.
export const recordDownload = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const trackId = req.params.trackId as string;
    const userId = req.user.userId;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, status: true, isPublic: true, agent: { select: { ownerId: true } } },
    });
    if (!track || track.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (!track.isPublic && track.agent.ownerId !== userId) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    // Atomic: only bump downloadCount on first download per user. P2002 on a
    // race means another request just won — treat as already-downloaded.
    let firstDownload = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.download.create({ data: { userId, trackId } });
        await tx.track.update({
          where: { id: trackId },
          data: { downloadCount: { increment: 1 } },
        });
        firstDownload = true;
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        firstDownload = false;
      } else {
        throw e;
      }
    }

    res.json({ downloaded: true, firstDownload });
  } catch (error) {
    logger.error('Record download error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to record download' });
  }
};

export const deleteTrack = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const id = req.params.id as string;
    const track = await prisma.track.findUnique({ where: { id }, include: { agent: true } });
    if (!track) { res.status(404).json({ error: 'Track not found' }); return; }
    if (track.agent.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    // Decrement the agent's denormalized counters by this track's contribution
    // before deleting. Otherwise totalPlays/totalLikes drift permanently up.
    await prisma.$transaction([
      prisma.aiAgent.update({
        where: { id: track.agentId },
        data: {
          totalPlays: { decrement: track.playCount },
          totalLikes: { decrement: track.likeCount },
        },
      }),
      prisma.track.delete({ where: { id } }),
    ]);
    res.json({ message: 'Track deleted' });
  } catch (error) {
    logger.error('Delete track error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete track' });
  }
};

export const getTrending = async (req: RequestWithUser, res: Response) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Rank by recent play count; do the sort in the DB rather than in memory.
    const grouped = await prisma.play.groupBy({
      by: ['trackId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { trackId: true },
      orderBy: { _count: { trackId: 'desc' } },
      take: limit * 2,
    });

    if (grouped.length === 0) {
      res.json({ tracks: [] });
      return;
    }

    const trackIds = grouped.map((g) => g.trackId);
    const playCounts = new Map(grouped.map((g) => [g.trackId, g._count.trackId]));

    const tracks = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
        status: 'ACTIVE',
        isPublic: true,
        takedownStatus: null,
      },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
      },
    });

    // Preserve the DB's play-count order and drop tracks that were filtered out.
    const ranked = trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({ ...t, recentPlayCount: playCounts.get(t.id) || 0 }))
      .slice(0, limit);

    res.json({ tracks: ranked });
  } catch (error) {
    logger.error('Get trending error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get trending' });
  }
};

// ─── Listening History ──────────────────────────────────────

export const getHistory = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const userId = req.user.userId;

    const [plays, distinctGroups] = await Promise.all([
      prisma.play.findMany({
        where: { userId },
        include: {
          track: {
            include: {
              agent: { select: { id: true, name: true, slug: true, avatar: true, ownerId: true } },
              genre: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        distinct: ['trackId'],
      }),
      prisma.play.groupBy({
        by: ['trackId'],
        where: { userId },
      }),
    ]);
    const total = distinctGroups.length;

    // Filter out private tracks the user no longer owns (data integrity)
    const visible = plays.filter((p) => {
      if (p.track.isPublic) return true;
      return p.track.agent.ownerId === userId;
    });

    res.json({
      tracks: visible.map((p) => ({
        ...p.track,
        playedAt: p.createdAt,
        durationPlayed: p.durationPlayed,
        completed: p.completed,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Get history error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get listening history' });
  }
};

// ─── Similar tracks ("More like this") ─────────────────────

export const getSimilarTracks = async (req: RequestWithUser, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug as string;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 12), 30);

    const source = await prisma.track.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'ACTIVE' },
      select: { id: true, genreId: true, agentId: true, mood: true, isPublic: true },
    });

    // Return identical 404 for both "doesn't exist" and "private/taken-down"
    // so unauthenticated callers can't enumerate IDs.
    if (!source || !source.isPublic) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }

    // Prefer same genre + similar mood, exclude the source
    const sameGenreOrMood = await prisma.track.findMany({
      where: {
        id: { not: source.id },
        status: 'ACTIVE',
        isPublic: true,
        OR: [
          ...(source.genreId ? [{ genreId: source.genreId }] : []),
          ...(source.mood ? [{ mood: source.mood }] : []),
        ],
      },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
      },
      orderBy: { playCount: 'desc' },
      take: limit * 2,
    });

    // Fill with more from the same agent if we don't have enough
    let results = sameGenreOrMood;
    if (results.length < limit) {
      const fromAgent = await prisma.track.findMany({
        where: {
          id: { notIn: [source.id, ...results.map((t) => t.id)] },
          agentId: source.agentId,
          status: 'ACTIVE',
          isPublic: true,
        },
        include: {
          agent: { select: { id: true, name: true, slug: true, avatar: true } },
          genre: true,
        },
        orderBy: { playCount: 'desc' },
        take: limit - results.length,
      });
      results = [...results, ...fromAgent];
    }

    // Shuffle slightly (deterministic tie-break by playCount) and trim
    const shuffled = results
      .map((t) => ({ t, k: t.playCount + Math.random() * 3 }))
      .sort((a, b) => b.k - a.k)
      .map(({ t }) => t)
      .slice(0, limit);

    res.json({ tracks: shuffled });
  } catch (error) {
    logger.error('Similar tracks error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get similar tracks' });
  }
};

// ─── Recommendations ("For You") ───────────────────────────

export const getRecommendations = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const [likedTracks, followedAgents] = await Promise.all([
      prisma.like.findMany({
        where: { userId: req.user.userId },
        include: { track: { select: { genreId: true, agentId: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.follow.findMany({
        where: { userId: req.user.userId },
        select: { agentId: true },
      }),
    ]);

    const likedTrackIds = likedTracks.map((l) => l.trackId);
    const genreIds = [...new Set(likedTracks.map((l) => l.track.genreId).filter(Boolean))] as string[];
    const agentIds = [...new Set([
      ...likedTracks.map((l) => l.track.agentId),
      ...followedAgents.map((f) => f.agentId),
    ])];
    const personalizationFilters = [
      ...(genreIds.length > 0 ? [{ genreId: { in: genreIds } }] : []),
      ...(agentIds.length > 0 ? [{ agentId: { in: agentIds } }] : []),
    ];

    const recommended = await prisma.track.findMany({
      where: {
        status: 'ACTIVE',
        isPublic: true,
        id: { notIn: likedTrackIds },
        ...(personalizationFilters.length > 0 ? { OR: personalizationFilters } : {}),
      },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
      },
      orderBy: { playCount: 'desc' },
      take: limit * 2,
    });

    // Fisher-Yates — `sort(() => Math.random() - 0.5)` is biased on V8 (the
    // sort comparator must be transitive; random comparators violate that
    // and skew toward the original order on TimSort).
    const shuffled = [...recommended];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = tmp;
    }

    res.json({ tracks: shuffled.slice(0, limit) });
  } catch (error) {
    logger.error('Get recommendations error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

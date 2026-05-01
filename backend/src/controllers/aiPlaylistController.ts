import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { minimaxChat } from '../utils/minimax';

interface ExtractedFilters {
  title: string;
  genres: string[];   // genre slugs
  moods: string[];
  keywords: string[];
  tempo?: 'slow' | 'medium' | 'fast' | null;
  instrumental?: boolean;
}

const FALLBACK_TITLES: Record<string, string> = {
  focus: 'Deep Focus',
  study: 'Study Session',
  workout: 'Workout Energy',
  chill: 'Chill Vibes',
  relax: 'Wind Down',
  sleep: 'Sleep & Drift',
  party: 'Party Starter',
  drive: 'Open Road',
};

function naiveExtract(prompt: string, allGenres: { slug: string; name: string }[]): ExtractedFilters {
  const lower = prompt.toLowerCase();
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenSet = new Set(tokens);

  const matchedGenres = allGenres
    .filter((g) => tokenSet.has(g.slug.toLowerCase()) || tokenSet.has(g.name.toLowerCase().replace(/\s+/g, '')))
    .map((g) => g.slug);

  const moodKeywords = [
    'chill', 'happy', 'sad', 'angry', 'romantic', 'dark', 'uplifting', 'epic',
    'mellow', 'energetic', 'dreamy', 'nostalgic', 'melancholic', 'hype', 'calm',
    'focused', 'aggressive', 'peaceful', 'mysterious', 'cinematic',
  ];
  const moods = moodKeywords.filter((m) => tokenSet.has(m));

  const tempo = tokenSet.has('fast') || tokenSet.has('upbeat') || tokenSet.has('high-energy')
    ? ('fast' as const)
    : tokenSet.has('slow') || tokenSet.has('downtempo')
    ? ('slow' as const)
    : null;

  const instrumental = tokenSet.has('instrumental') || tokenSet.has('no-vocals') ? true : undefined;

  // Title pick: first matching keyword from FALLBACK_TITLES, else first 6 words of prompt
  let title = '';
  for (const k of Object.keys(FALLBACK_TITLES)) {
    if (tokenSet.has(k)) { title = FALLBACK_TITLES[k] ?? ''; break; }
  }
  if (!title) {
    const words = prompt.trim().split(/\s+/).slice(0, 6).join(' ');
    title = words.charAt(0).toUpperCase() + words.slice(1);
  }

  return {
    title: title || 'My Vibe',
    genres: matchedGenres,
    moods,
    keywords: tokens.filter((t) => t.length > 3).slice(0, 10),
    tempo,
    instrumental,
  };
}

async function llmExtract(prompt: string, allGenres: { slug: string; name: string }[]): Promise<ExtractedFilters | null> {
  if (!process.env.MINIMAX_API_KEY) return null;
  const genreList = allGenres.map((g) => `- ${g.slug} (${g.name})`).join('\n');
  const system =
    `You translate a user's vibe into a JSON object that filters a music catalog. ` +
    `Respond with JSON only — no prose, no markdown fences. Keys: title (3-5 words), ` +
    `genres (array of slugs from the list), moods (array), keywords (array), ` +
    `tempo (one of "slow"|"medium"|"fast"|null), instrumental (boolean|null).\n\n` +
    `Available genre slugs:\n${genreList}\n\n` +
    `Pick 1-3 genres that best fit. Pick 1-4 moods. Keep keywords to 3-6 single words.`;

  try {
    const { text } = await minimaxChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      maxTokens: 400,
      temperature: 0.4,
    });
    // Strip markdown fences if the model added them anyway
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    const validSlugs = new Set(allGenres.map((g) => g.slug));
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 80) : 'My Vibe',
      genres: Array.isArray(parsed.genres) ? parsed.genres.filter((s: any) => typeof s === 'string' && validSlugs.has(s)) : [],
      moods: Array.isArray(parsed.moods) ? parsed.moods.filter((s: any) => typeof s === 'string').slice(0, 6) : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((s: any) => typeof s === 'string').slice(0, 10) : [],
      tempo:
        typeof parsed.tempo === 'string' && ['slow', 'medium', 'fast'].includes(parsed.tempo)
          ? parsed.tempo
          : null,
      instrumental: typeof parsed.instrumental === 'boolean' ? parsed.instrumental : undefined,
    };
  } catch (e) {
    logger.warn('LLM extract failed, falling back to naive', { error: (e as Error).message });
    return null;
  }
}

export const playlistFromPrompt = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const prompt = String(req.body?.prompt ?? '').trim();
    if (!prompt || prompt.length < 3) {
      res.status(400).json({ error: 'Provide a vibe — what do you want to hear?' });
      return;
    }
    if (prompt.length > 500) {
      res.status(400).json({ error: 'Prompt too long (max 500 chars)' });
      return;
    }
    const limit = Math.min(Math.max(5, parseInt(req.body?.limit as string) || 20), 30);
    const save = Boolean(req.body?.save);

    const allGenres = await prisma.genre.findMany({ select: { slug: true, name: true } });

    const filters = (await llmExtract(prompt, allGenres)) ?? naiveExtract(prompt, allGenres);

    const genreIds = filters.genres.length > 0
      ? (await prisma.genre.findMany({ where: { slug: { in: filters.genres } }, select: { id: true } })).map((g) => g.id)
      : [];

    // Build flexible OR-based candidate pool, then rerank
    const orClauses: any[] = [];
    if (genreIds.length > 0) orClauses.push({ genreId: { in: genreIds } });
    if (filters.moods.length > 0) orClauses.push({ mood: { in: filters.moods } });
    for (const kw of filters.keywords) {
      if (kw.length < 3) continue;
      orClauses.push({ title: { contains: kw, mode: 'insensitive' as const } });
      orClauses.push({ tags: { has: kw } });
    }

    const candidates = await prisma.track.findMany({
      where: {
        status: 'ACTIVE',
        isPublic: true,
        ...(orClauses.length > 0 ? { OR: orClauses } : {}),
      },
      include: {
        agent: { select: { id: true, name: true, slug: true, avatar: true } },
        genre: true,
      },
      orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      take: limit * 4,
    });

    // Score: 3 for genre hit, 2 for mood hit, 1 per keyword hit in title/tags, plus small play-count tiebreak
    const moodSet = new Set(filters.moods);
    const kwSet = new Set(filters.keywords.map((k) => k.toLowerCase()));
    const scored = candidates.map((t) => {
      let score = 0;
      if (genreIds.length > 0 && t.genreId && genreIds.includes(t.genreId)) score += 3;
      if (t.mood && moodSet.has(t.mood)) score += 2;
      const lowerTitle = t.title.toLowerCase();
      for (const k of kwSet) if (lowerTitle.includes(k)) score += 1;
      for (const tag of t.tags || []) if (kwSet.has(tag.toLowerCase())) score += 1;
      score += Math.log10(1 + (t.playCount || 0)) * 0.4; // gentle popularity bias
      return { t, score };
    });
    scored.sort((a, b) => b.score - a.score);

    // De-dupe by agent so the playlist isn't all from one creator (max 3 per agent)
    const perAgent = new Map<string, number>();
    const picked: typeof candidates = [];
    for (const { t } of scored) {
      const c = perAgent.get(t.agentId) ?? 0;
      if (c >= 3) continue;
      picked.push(t);
      perAgent.set(t.agentId, c + 1);
      if (picked.length >= limit) break;
    }

    // If we got too few, top up from trending
    if (picked.length < Math.min(8, limit)) {
      const fillers = await prisma.track.findMany({
        where: {
          status: 'ACTIVE',
          isPublic: true,
          id: { notIn: picked.map((t) => t.id) },
        },
        include: {
          agent: { select: { id: true, name: true, slug: true, avatar: true } },
          genre: true,
        },
        orderBy: { playCount: 'desc' },
        take: limit - picked.length,
      });
      picked.push(...fillers);
    }

    let savedPlaylist: { id: string; slug: string; title: string } | null = null;
    if (save && picked.length > 0) {
      const baseSlug = filters.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'vibe';
      // TOCTOU race: two concurrent requests with the same baseSlug both pass
      // the findUnique check, then one P2002s on create. Append a short
      // disambiguator unconditionally on the first try; on P2002, append a
      // longer one.
      let slug = `${baseSlug}-${Date.now().toString(36)}`;
      let created;
      try {
        created = await prisma.playlist.create({
          data: {
            title: filters.title,
            slug,
            description: prompt.slice(0, 280),
            isPublic: false,
            userId: req.user.userId,
            tracks: {
              create: picked.map((t, i) => ({ trackId: t.id, position: i })),
            },
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          slug = `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          created = await prisma.playlist.create({
            data: {
              title: filters.title,
              slug,
              description: prompt.slice(0, 280),
              isPublic: false,
              userId: req.user.userId,
              tracks: {
                create: picked.map((t, i) => ({ trackId: t.id, position: i })),
              },
            },
          });
        } else {
          throw err;
        }
      }
      savedPlaylist = { id: created.id, slug: created.slug, title: created.title };
    }

    res.json({
      title: filters.title,
      filters,
      tracks: picked,
      playlist: savedPlaylist,
    });
  } catch (error) {
    logger.error('Playlist from prompt error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to build playlist from prompt' });
  }
};

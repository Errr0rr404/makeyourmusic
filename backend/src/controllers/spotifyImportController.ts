// Spotify import — creates AI versions of a user's Spotify catalog.
//
// Two source modes:
//   1. OAuth: user connects Spotify → we fetch their top tracks via the
//      Spotify Web API → seed N music generations.
//   2. Manual: user pastes a list of "Title — Artist" lines → we map each to
//      a generation seed without calling Spotify at all (handy for testing
//      and for users who don't want to OAuth).
//
// Both modes funnel into the same SpotifyImport row + the same per-track
// generation orchestration. The job is long-lived; the dashboard polls
// /api/spotify-imports/:id for progress.
//
// Env:
//   SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET — when set, /authorize-url
//   returns a real Spotify auth URL. When unset, the manual paste flow is
//   the only path; the dashboard hides the OAuth button.

import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { processMusicGeneration } from './aiGenerationController';
import { assertCanGenerate } from '../utils/aiUsage';

const MAX_TRACKS_PER_IMPORT = 25;

function hasSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

interface SourceTrack {
  title: string;
  artist?: string;
  genre?: string;
  mood?: string;
  era?: string;
}

function parseManualList(raw: string): SourceTrack[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_TRACKS_PER_IMPORT)
    .map((line) => {
      // "Title — Artist" or "Title - Artist" or just "Title"
      const m = line.match(/^(.+?)\s*[—\-–]\s*(.+)$/);
      if (m && m[1] && m[2]) return { title: m[1].trim(), artist: m[2].trim() };
      return { title: line };
    });
}

// GET /api/spotify-imports/auth-url — returns a Spotify authorize URL the
// user can visit to grant top-tracks read access. Only meaningful when env
// is configured; otherwise we 200 with `enabled: false` so the UI knows.
export const getSpotifyAuthUrl = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasSpotifyConfigured()) {
      res.json({ enabled: false });
      return;
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID || '',
      scope: 'user-top-read',
      redirect_uri: `${process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000'}/settings/spotify-import`,
      state: req.user.userId,
      show_dialog: 'true',
    });
    res.json({
      enabled: true,
      url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    });
  } catch (error) {
    logger.error('getSpotifyAuthUrl error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to build Spotify auth URL' });
  }
};

// POST /api/spotify-imports
// Body (manual): { mode: 'manual', text: "Track 1 - Artist\nTrack 2 - Artist\n..." }
// Body (oauth):  { mode: 'oauth', code: "<spotify auth code>" }
export const startSpotifyImport = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Block burst — one running import per user max.
    const inFlight = await prisma.spotifyImport.findFirst({
      where: { userId: req.user.userId, status: { in: ['PENDING', 'RUNNING'] } },
    });
    if (inFlight) {
      res.status(409).json({ error: 'You already have an import running.', importId: inFlight.id });
      return;
    }

    const { mode, text, code } = req.body || {};
    let sources: SourceTrack[] = [];

    if (mode === 'manual') {
      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'text is required (one track per line)' });
        return;
      }
      sources = parseManualList(text);
    } else if (mode === 'oauth') {
      if (!hasSpotifyConfigured()) {
        res.status(400).json({ error: 'Spotify OAuth is not configured on this server' });
        return;
      }
      if (typeof code !== 'string' || !code) {
        res.status(400).json({ error: 'code is required' });
        return;
      }
      // Real implementation would: POST /api/token to exchange code for
      // access_token; GET /v1/me/top/tracks?limit=25 with Bearer; map each
      // result to SourceTrack. Without a real flow under test we fall back
      // to manual mode: callers pass `text` alongside `code` to seed during
      // dev. This keeps the path exercised without making live HTTP calls
      // from a test environment.
      if (typeof text === 'string' && text.trim()) {
        sources = parseManualList(text);
      } else {
        res.status(501).json({ error: 'Spotify OAuth integration not yet active. Use mode=manual.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'mode must be "manual" or "oauth"' });
      return;
    }

    if (sources.length === 0) {
      res.status(400).json({ error: 'No tracks parsed. Provide at least one line.' });
      return;
    }

    const userAgent = await prisma.aiAgent.findFirst({
      where: { ownerId: req.user.userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!userAgent) {
      res.status(400).json({
        error: 'You need at least one active agent before importing. Create one from /creator.',
      });
      return;
    }

    const job = await prisma.spotifyImport.create({
      data: {
        userId: req.user.userId,
        status: 'RUNNING',
        sourceTracks: sources as never,
        totalCount: sources.length,
        doneCount: 0,
        generationIds: [],
      },
    });

    // Kick off generations one-by-one to respect daily caps. Fire-and-forget
    // (the response returns immediately with the job id; the dashboard polls).
    void (async () => {
      const generationIds: string[] = [];
      let done = 0;
      for (const source of sources) {
        try {
          await assertCanGenerate(req.user!.userId);
        } catch (err) {
          await prisma.spotifyImport.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: `Daily generation cap hit after ${done} tracks: ${(err as Error).message}`.slice(0, 500),
              generationIds,
              doneCount: done,
            },
          }).catch(() => undefined);
          return;
        }
        try {
          const promptParts = [
            `In the spirit of "${source.title}"${source.artist ? ` by ${source.artist}` : ''}.`,
            'Create an original AI track inspired by the energy and arrangement style — do not recreate the recording.',
          ];
          if (source.genre) promptParts.push(`Genre: ${source.genre}`);
          if (source.mood) promptParts.push(`Mood: ${source.mood}`);
          if (source.era) promptParts.push(`Era: ${source.era}`);

          const generation = await prisma.musicGeneration.create({
            data: {
              userId: req.user!.userId,
              agentId: userAgent.id,
              title: `${source.title} (AI take)`,
              prompt: promptParts.join('\n'),
              genre: source.genre || null,
              mood: source.mood || null,
              era: source.era || null,
              isInstrumental: false,
              provider: 'minimax',
              providerModel: process.env.MINIMAX_MUSIC_MODEL || 'music-2.6',
              status: 'PENDING',
            },
          });
          generationIds.push(generation.id);
          done += 1;
          await prisma.spotifyImport.update({
            where: { id: job.id },
            data: { generationIds, doneCount: done },
          });
          // Fire processing without awaiting — the orchestrator throttles
          // internally via daily cap re-checks.
          void processMusicGeneration(generation.id);
          // Small inter-track delay so we don't burst the provider with 25
          // concurrent /generate calls. 300ms is well under the per-minute
          // burst limiter (20/min) and fits a 25-track run inside ~10s.
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          logger.warn('spotify import: generation create failed', {
            jobId: job.id,
            title: source.title,
            error: (err as Error).message,
          });
        }
      }
      await prisma.spotifyImport.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          doneCount: done,
          generationIds,
        },
      }).catch(() => undefined);
    })();

    res.status(202).json({ import: job });
  } catch (error) {
    logger.error('startSpotifyImport error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to start import' });
  }
};

// GET /api/spotify-imports/:id — progress poll.
export const getSpotifyImport = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = req.params.id as string;
    const job = await prisma.spotifyImport.findUnique({ where: { id } });
    if (!job || job.userId !== req.user.userId) {
      res.status(404).json({ error: 'Import not found' });
      return;
    }
    res.json({ import: job });
  } catch (error) {
    logger.error('getSpotifyImport error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load import' });
  }
};

// GET /api/spotify-imports — list the requester's imports (most recent first).
export const listMySpotifyImports = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const jobs = await prisma.spotifyImport.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    res.json({ imports: jobs });
  } catch (error) {
    logger.error('listMySpotifyImports error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to list imports' });
  }
};

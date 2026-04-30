import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// Heuristic karaoke timing.
//
// We don't yet do forced alignment (whisper-timestamped). Instead we split
// the lyrics into singable lines, drop section tags + parentheticals, and
// distribute the track duration across lines weighted by syllable count.
// Result is good enough for a "highlight current line" UX on the player.
//
// Upgrade path: when an audio analysis service is wired up, replace
// heuristicTimings() with actual timings keyed by line.

const SECTION_TAG_RE = /^\s*\[[^\]\n]+\]\s*$/;

function approxSyllables(line: string): number {
  // Strip parens/brackets, lowercase, count vowel groups. Coarse but
  // monotonic — we only use the result for relative weighting.
  const cleaned = line
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .toLowerCase()
    .trim();
  if (!cleaned) return 0;
  const groups = cleaned.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 0);
}

interface Line {
  text: string;
  startSec: number;
  endSec: number;
  isSection: boolean;
}

export function heuristicTimings(lyrics: string, durationSec: number): Line[] {
  if (!lyrics || durationSec <= 0) return [];
  const rawLines = lyrics
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = rawLines.map((text) => ({
    text,
    isSection: SECTION_TAG_RE.test(text),
    weight: SECTION_TAG_RE.test(text) ? 0.5 : approxSyllables(text),
  }));

  const totalWeight = items.reduce((acc, i) => acc + (i.weight || 1), 0) || 1;
  // Reserve 5% of duration as a leading silence (intro), 10% trailing.
  const head = durationSec * 0.05;
  const tail = durationSec * 0.1;
  const span = Math.max(0, durationSec - head - tail);

  const out: Line[] = [];
  let cursor = head;
  for (const item of items) {
    const slice = (span * (item.weight || 1)) / totalWeight;
    const startSec = cursor;
    const endSec = cursor + slice;
    out.push({
      text: item.text,
      startSec: Math.max(0, parseFloat(startSec.toFixed(2))),
      endSec: Math.max(0, parseFloat(endSec.toFixed(2))),
      isSection: item.isSection,
    });
    cursor = endSec;
  }
  return out;
}

export const karaokeLyrics = async (req: RequestWithUser, res: Response) => {
  try {
    const trackId = req.params.trackId as string;
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, lyrics: true, duration: true, isPublic: true, status: true },
    });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    if (!track.isPublic || track.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Track is not public' });
      return;
    }
    const lines = track.lyrics ? heuristicTimings(track.lyrics, track.duration) : [];
    res.json({ trackId: track.id, durationSec: track.duration, lines });
  } catch (error) {
    logger.error('karaokeLyrics error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to compute karaoke timings' });
  }
};

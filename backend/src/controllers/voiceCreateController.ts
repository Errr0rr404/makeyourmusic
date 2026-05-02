// Voice-controlled creation.
//
// One-shot endpoint that transcribes an audio prompt and immediately fires
// off a music generation, returning the new MusicGeneration row. The mobile
// "🎙 speak it" button + future CarPlay scene both POST here. Saves the
// user a round-trip vs. transcribe-then-generate.
//
// Request: multipart/form-data with field "audio" (mp3/m4a/wav/webm/ogg/aac/flac).
//          Optional fields: instrumental (bool), agentId (string).
// Response: { generation: MusicGeneration, transcript: string }
//
// Daily quotas: hits BOTH the transcribe cap (paid OpenAI ASR) and the
// AI generation cap. The user sees whichever 429 fires first.

import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { prisma } from '../utils/db';
import { processMusicGeneration } from './aiGenerationController';
import { assertCanGenerate } from '../utils/aiUsage';

const ALLOWED_AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
]);

const DAILY_VOICE_CAP = 100;
const voiceCounts = new Map<string, { day: string; count: number }>();
function bumpVoiceCount(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const existing = voiceCounts.get(userId);
  if (!existing || existing.day !== day) {
    voiceCounts.set(userId, { day, count: 1 });
    return true;
  }
  if (existing.count >= DAILY_VOICE_CAP) return false;
  existing.count += 1;
  return true;
}

async function transcribeBuffer(buf: Buffer, mimetype: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Transcription is not configured on this server');
  }
  const formData = new (globalThis as any).FormData();
  const blob = new (globalThis as any).Blob([buf], { type: mimetype || 'audio/m4a' });
  formData.append('file', blob, 'audio.m4a');
  formData.append('model', 'gpt-4o-mini-transcribe');
  formData.append('response_format', 'json');

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    logger.error('voice-create transcription HTTP error', { status: resp.status, body: txt.slice(0, 500) });
    throw new Error('Transcription service failed');
  }
  const json = (await resp.json()) as { text?: string };
  return (json?.text || '').trim();
}

export const voiceCreate = async (req: RequestWithUser & { file?: any }, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!bumpVoiceCount(req.user.userId)) {
      res.status(429).json({ error: 'Daily voice-create limit reached.' });
      return;
    }
    if (!req.file?.buffer) {
      res.status(400).json({ error: 'audio file is required' });
      return;
    }
    const mimetype: string = req.file.mimetype || '';
    if (!ALLOWED_AUDIO_MIME.has(mimetype)) {
      res.status(400).json({ error: 'Unsupported audio format. Use mp3/m4a/wav/webm/ogg/aac/flac.' });
      return;
    }
    const buf: Buffer = req.file.buffer;
    if (buf.length > 5 * 1024 * 1024) {
      res.status(413).json({ error: 'audio too large (max 5MB)' });
      return;
    }

    // Daily generation cap is the more painful one — check up-front so the
    // user doesn't burn a transcription call we'll then refuse to act on.
    try {
      await assertCanGenerate(req.user.userId);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 429) {
        res.status(429).json({
          error: (err as Error).message,
          usage: (err as { usage?: unknown }).usage,
        });
        return;
      }
      throw err;
    }

    const transcript = await transcribeBuffer(buf, mimetype);
    if (!transcript || transcript.length < 3) {
      res.status(400).json({ error: 'Could not understand the audio — try again' });
      return;
    }

    // Heuristic: if the user said the word "instrumental" anywhere in the
    // prompt, we honor that; otherwise default to vocal (it's the more
    // common voice-described intent).
    const explicitlyInstrumental = /\binstrumental\b/i.test(transcript);
    const instrumentalFlag = req.body?.instrumental != null
      ? String(req.body.instrumental) === 'true'
      : explicitlyInstrumental;

    const agentId = typeof req.body?.agentId === 'string' && req.body.agentId.length > 0
      ? req.body.agentId
      : null;
    if (agentId) {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        select: { ownerId: true },
      });
      if (!agent || agent.ownerId !== req.user.userId) {
        res.status(403).json({ error: 'You do not own this agent' });
        return;
      }
    }

    const gen = await prisma.musicGeneration.create({
      data: {
        userId: req.user.userId,
        agentId,
        prompt: transcript.slice(0, 2000),
        isInstrumental: instrumentalFlag,
        provider: 'minimax',
        status: 'PENDING',
      } as Prisma.MusicGenerationUncheckedCreateInput,
      select: {
        id: true,
        userId: true,
        prompt: true,
        isInstrumental: true,
        status: true,
        createdAt: true,
      },
    });

    void processMusicGeneration(gen.id).catch((err) => {
      logger.warn('voiceCreate: processMusicGeneration crashed', {
        generationId: gen.id,
        error: (err as Error).message,
      });
    });

    res.status(202).json({ generation: gen, transcript });
  } catch (error) {
    logger.error('voiceCreate error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create from voice' });
  }
};

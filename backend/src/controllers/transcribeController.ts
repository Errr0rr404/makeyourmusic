import { Response } from 'express';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// MIME types Whisper / gpt-4o-mini-transcribe actually accept. Filtering
// here saves an OpenAI quota call and avoids relaying user-controlled
// binary garbage to a paid endpoint.
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

// Voice → text. Used by the mobile "hold to speak a song idea" flow.
//
// Two transcription backends are supported, picked by env:
//   - OPENAI_API_KEY: forwards to gpt-4o-mini-transcribe via Whisper API
//   - MINIMAX_API_KEY (default): MiniMax has no public ASR yet — falls back
//     to a polite 503 so the app can degrade to typed input.
//
// Audio is expected as multipart/form-data with field "audio". File size is
// capped to 5MB (a couple minutes of speech).
export const transcribeAudio = async (req: RequestWithUser & { file?: any }, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.file?.buffer) {
      res.status(400).json({ error: 'audio file is required' });
      return;
    }
    const mimetype: string = req.file.mimetype || '';
    if (!ALLOWED_AUDIO_MIME.has(mimetype)) {
      res.status(400).json({
        error: 'Unsupported audio format. Use mp3/m4a/wav/webm/ogg/aac/flac.',
      });
      return;
    }
    const buf: Buffer = req.file.buffer;
    if (buf.length > 5 * 1024 * 1024) {
      res.status(413).json({ error: 'audio too large (max 5MB)' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(503).json({ error: 'Transcription is not configured on this server' });
      return;
    }

    // OpenAI Audio Transcriptions API. Use Web FormData so we don't need the
    // form-data npm package — Node 20+ has it natively.
    const formData = new (globalThis as any).FormData();
    const blob = new (globalThis as any).Blob([buf], { type: req.file.mimetype || 'audio/m4a' });
    formData.append('file', blob, req.file.originalname || 'audio.m4a');
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('response_format', 'json');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });
    if (!resp.ok) {
      const txt = await resp.text();
      logger.error('Transcription HTTP error', { status: resp.status, body: txt.slice(0, 500) });
      res.status(502).json({ error: 'Transcription service failed' });
      return;
    }
    const json = (await resp.json()) as any;
    res.json({ text: json?.text || '' });
  } catch (error) {
    logger.error('transcribeAudio error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to transcribe' });
  }
};

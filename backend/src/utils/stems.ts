// Stem separation via Replicate (Demucs htdemucs model).
//
// Activated when REPLICATE_API_TOKEN is set. The flow is:
//   1. POST /v1/predictions to start a Demucs run with the track audio URL
//   2. Poll the prediction id until status=succeeded
//   3. Download the four output URLs (drums, bass, vocals, other)
//   4. (optionally) re-host them on Cloudinary and persist URLs to TrackStems
//
// Without the key set, the request endpoint returns a "stems unavailable"
// error and TrackStems stays in PENDING. This keeps the feature visible in
// the API surface while the integration is being wired up.

import logger from './logger';

const REPLICATE_BASE = 'https://api.replicate.com/v1';
// htdemucs is the production-grade Demucs variant — 4 stems, MP3 output by
// default. Bump the version hash when Replicate releases a newer pin.
const DEMUCS_MODEL_VERSION =
  process.env.REPLICATE_DEMUCS_VERSION ||
  'cd128044b8a6c7e2d2dba6fdcfc1afe6d2a86e35afd0f6a09f4a4d0a37f1d4d2';

export class StemProviderUnavailable extends Error {
  constructor() {
    super('Stem separation provider is not configured (REPLICATE_API_TOKEN missing)');
  }
}

function isConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

interface StartResult {
  jobId: string;
  raw: unknown;
}

export async function startStemsJob(audioUrl: string): Promise<StartResult> {
  if (!isConfigured()) throw new StemProviderUnavailable();

  const res = await fetch(`${REPLICATE_BASE}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: DEMUCS_MODEL_VERSION,
      input: {
        audio: audioUrl,
        stem: 'none', // emit all four stems
        model: 'htdemucs',
        output_format: 'mp3',
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    logger.error('Replicate stems start failed', { status: res.status, body: txt.slice(0, 500) });
    throw new Error(`Replicate stems start failed (${res.status})`);
  }
  const json = (await res.json()) as any;
  if (!json?.id) throw new Error('Replicate did not return a prediction id');
  return { jobId: json.id, raw: json };
}

interface PollResult {
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: { drums?: string; bass?: string; vocals?: string; other?: string };
  error?: string;
}

export async function pollStemsJob(jobId: string): Promise<PollResult> {
  if (!isConfigured()) throw new StemProviderUnavailable();
  const res = await fetch(`${REPLICATE_BASE}/predictions/${jobId}`, {
    headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Replicate stems poll failed (${res.status})`);
  const json = (await res.json()) as any;
  return {
    status: json.status,
    output: json.output as PollResult['output'],
    error: json.error,
  };
}

export const STEM_PROVIDER_ID = 'replicate-demucs';

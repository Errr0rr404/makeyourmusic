import logger from './logger';

const DEFAULT_BASE = 'https://api.minimax.io/v1';

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error('MINIMAX_API_KEY is not configured');
  return key;
}

function getBase(): string {
  return process.env.MINIMAX_API_BASE || DEFAULT_BASE;
}

function getGroupId(): string | undefined {
  const g = process.env.MINIMAX_GROUP_ID?.trim();
  return g && g.length > 0 ? g : undefined;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
    ...extra,
  };
  return h;
}

function buildUrl(path: string, search?: Record<string, string | undefined>): string {
  const base = getBase().replace(/\/$/, '');
  const qs = new URLSearchParams();
  const groupId = getGroupId();
  if (groupId) qs.set('GroupId', groupId);
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v != null) qs.set(k, v);
    }
  }
  const query = qs.toString();
  return `${base}${path.startsWith('/') ? path : `/${path}`}${query ? `?${query}` : ''}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`MiniMax non-JSON response (${res.status}): ${text.slice(0, 500)}`);
  }
}

// ─── Chat completions (for lyric generation) ──────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  raw: unknown;
}

export async function minimaxChat(params: {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<ChatResult> {
  const model = params.model || process.env.MINIMAX_CHAT_MODEL || 'MiniMax-Text-01';
  const url = buildUrl('/text/chatcompletion_v2');
  const body = {
    model,
    messages: params.messages,
    max_tokens: params.maxTokens ?? 800,
    temperature: params.temperature ?? 0.9,
    stream: false,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax chat failed', { status: res.status, body: errText.slice(0, 500) });
    throw new Error(`MiniMax chat failed (${res.status})`);
  }

  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    logger.error('MiniMax chat returned error', {
      code: baseResp.status_code,
      msg: baseResp.status_msg,
    });
    throw new Error(
      `MiniMax chat error ${baseResp.status_code}: ${baseResp.status_msg || 'unknown'}`
    );
  }
  const text: string = json?.choices?.[0]?.message?.content ?? '';
  if (!text) {
    logger.warn('MiniMax chat returned no content', { raw: json });
  }
  return { text, raw: json };
}

// ─── Music generation ─────────────────────────────────────

// MiniMax baseResp.status_code values that indicate transient quota / rate-limit
// problems where retrying with a fallback model is reasonable.
// Source: MiniMax common error codes (1002 rate limit, 1039 token-rate limit,
// 1042 daily-quota / model-quota exhausted, 2013 invalid model — used as last
// signal that a model id has been disabled on the account).
export const MINIMAX_RATE_LIMIT_CODES = new Set([1002, 1039, 1042, 2013]);

export class MinimaxRateLimitError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'MinimaxRateLimitError';
  }
}

export interface MusicGenerationParams {
  prompt?: string;
  lyrics?: string;
  model?: string;
  isInstrumental?: boolean;
  lyricsOptimizer?: boolean;
  audioSetting?: {
    sampleRate?: number;
    bitrate?: number;
    format?: 'mp3' | 'wav' | 'pcm';
  };
  outputFormat?: 'url' | 'hex';
  // For cover mode
  audioUrl?: string;
  audioBase64?: string;
}

export interface MusicGenerationResult {
  audioUrl?: string;
  audioHex?: string;
  durationSec?: number;
  traceId?: string;
  raw: unknown;
}

export async function minimaxGenerateMusic(
  params: MusicGenerationParams
): Promise<MusicGenerationResult> {
  const model = params.model || process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
  const url = buildUrl('/music_generation');
  const body: Record<string, unknown> = {
    model,
    output_format: params.outputFormat || 'url',
    audio_setting: {
      sample_rate: params.audioSetting?.sampleRate || 44100,
      bitrate: params.audioSetting?.bitrate || 256000,
      format: params.audioSetting?.format || 'mp3',
    },
  };

  if (params.prompt) body.prompt = params.prompt;
  if (params.lyrics) body.lyrics = params.lyrics;
  if (params.isInstrumental != null) body.is_instrumental = params.isInstrumental;
  // Auto-generate lyrics when caller didn't supply any and the track has vocals.
  // Only the music-2.6 family supports this flag.
  const wantsAutoLyrics =
    params.lyricsOptimizer ??
    (!params.lyrics && !params.isInstrumental && !params.audioUrl && !params.audioBase64);
  if (wantsAutoLyrics && /^music-2\.6/.test(model)) body.lyrics_optimizer = true;
  if (params.audioUrl) body.audio_url = params.audioUrl;
  if (params.audioBase64) body.audio_base64 = params.audioBase64;

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax music generation HTTP error', {
      status: res.status,
      model,
      body: errText.slice(0, 500),
    });
    if (res.status === 429) {
      throw new MinimaxRateLimitError(429, `MiniMax music generation rate-limited (${res.status})`);
    }
    throw new Error(`MiniMax music generation failed (${res.status})`);
  }

  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    const code = baseResp.status_code as number;
    const msg = baseResp.status_msg || 'unknown';
    if (MINIMAX_RATE_LIMIT_CODES.has(code)) {
      throw new MinimaxRateLimitError(code, `MiniMax music generation error ${code}: ${msg}`);
    }
    throw new Error(`MiniMax music generation error ${code}: ${msg}`);
  }

  const audio = (json?.data?.audio || json?.data?.audio_url || json?.audio_url) as string | undefined;
  let audioUrl: string | undefined;
  let audioHex: string | undefined;

  if (audio) {
    if (/^https?:\/\//i.test(audio)) {
      audioUrl = audio;
    } else {
      audioHex = audio;
    }
  }

  const rawDuration = json?.extra_info?.music_duration;
  const durationSec =
    typeof rawDuration === 'number'
      ? rawDuration > 1000
        ? Math.round(rawDuration / 1000)
        : rawDuration
      : undefined;

  return {
    audioUrl,
    audioHex,
    durationSec,
    traceId: json?.trace_id,
    raw: json,
  };
}

// ─── Video generation (async) ─────────────────────────────

export interface VideoStartParams {
  prompt: string;
  model?: string;
  firstFrameImage?: string; // base64 or URL for I2V
  subjectReference?: string; // base64 or URL
  resolution?: '720P' | '768P' | '1080P';
  duration?: 6 | 10;
  promptOptimizer?: boolean;
}

export interface VideoStartResult {
  taskId: string;
  raw: unknown;
}

export async function minimaxStartVideo(params: VideoStartParams): Promise<VideoStartResult> {
  const model = params.model || process.env.MINIMAX_VIDEO_MODEL || 'MiniMax-Hailuo-2.3-Fast';
  const url = buildUrl('/video_generation');
  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
  };
  // Hailuo-02 / Hailuo-2.3 honor resolution + duration; older models ignore them.
  if (/Hailuo/i.test(model)) {
    body.resolution = params.resolution || '768P';
    body.duration = params.duration || 6;
  }
  if (params.promptOptimizer != null) body.prompt_optimizer = params.promptOptimizer;
  if (params.firstFrameImage) body.first_frame_image = params.firstFrameImage;
  if (params.subjectReference) body.subject_reference = params.subjectReference;

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax video start HTTP error', {
      status: res.status,
      body: errText.slice(0, 500),
    });
    throw new Error(`MiniMax video start failed (${res.status})`);
  }

  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    throw new Error(
      `MiniMax video start error ${baseResp.status_code}: ${baseResp.status_msg || 'unknown'}`
    );
  }
  const taskId = json?.task_id || json?.data?.task_id;
  if (!taskId) {
    throw new Error('MiniMax did not return a video task_id');
  }
  return { taskId, raw: json };
}

export type VideoTaskStatus = 'Queueing' | 'Preparing' | 'Processing' | 'Success' | 'Fail';

export interface VideoStatusResult {
  status: VideoTaskStatus;
  fileId?: string;
  raw: unknown;
}

export async function minimaxQueryVideo(taskId: string): Promise<VideoStatusResult> {
  const url = buildUrl('/query/video_generation', { task_id: taskId });
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax video query HTTP error', {
      status: res.status,
      body: errText.slice(0, 500),
    });
    throw new Error(`MiniMax video query failed (${res.status})`);
  }

  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    throw new Error(
      `MiniMax video query error ${baseResp.status_code}: ${baseResp.status_msg || 'unknown'}`
    );
  }
  return {
    status: (json?.status || json?.data?.status) as VideoTaskStatus,
    fileId: json?.file_id || json?.data?.file_id,
    raw: json,
  };
}

export async function minimaxRetrieveFile(fileId: string): Promise<{ downloadUrl: string }> {
  const url = buildUrl('/files/retrieve', { file_id: fileId });
  const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax file retrieve HTTP error', {
      status: res.status,
      body: errText.slice(0, 500),
    });
    throw new Error(`MiniMax file retrieve failed (${res.status})`);
  }
  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    throw new Error(
      `MiniMax file retrieve error ${baseResp.status_code}: ${baseResp.status_msg || 'unknown'}`
    );
  }
  const downloadUrl: string | undefined = json?.file?.download_url || json?.data?.download_url;
  if (!downloadUrl) {
    throw new Error('MiniMax file retrieve returned no download_url');
  }
  return { downloadUrl };
}

// ─── Convenience: generate lyrics from prompt ─────────────

export interface LyricsParams {
  idea: string;
  genre?: string;
  subGenre?: string;
  mood?: string;
  energy?: string;
  era?: string;
  vocalStyle?: string;
  vibeDescriptors?: string; // already-translated vibe reference (no artist names)
  language?: string;
  style?: string;
}

export async function minimaxGenerateLyrics(params: LyricsParams): Promise<{
  lyrics: string;
  raw: unknown;
}> {
  const {
    idea,
    genre,
    subGenre,
    mood,
    energy,
    era,
    vocalStyle,
    vibeDescriptors,
    language = 'English',
    style,
  } = params;
  const constraints: string[] = [];
  const genreLine = [genre, subGenre].filter(Boolean).join(' / ');
  if (genreLine) constraints.push(`Genre: ${genreLine}`);
  if (mood) constraints.push(`Mood: ${mood}`);
  if (energy) constraints.push(`Energy: ${energy}`);
  if (era) constraints.push(`Era: ${era}`);
  if (vocalStyle) constraints.push(`Vocal style: ${vocalStyle}`);
  if (vibeDescriptors) constraints.push(`Sonic vibe: ${vibeDescriptors}`);
  if (style) constraints.push(`Extra notes: ${style}`);

  const system =
    `You are a talented songwriter. Write original song lyrics in ${language} that are evocative, radio-ready, and emotionally resonant. ` +
    `Use clear structure tags on their own lines: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro]. ` +
    `Match the lyrical voice and cadence to the genre and mood — e.g. punchy short lines for trap, narrative imagery for indie folk, hooky chant choruses for dance pop. ` +
    `Keep the total length between 200 and 800 words. ` +
    `Avoid copyrighted lyrics. Output ONLY the lyrics — no commentary.`;

  const user =
    `Write a song about: ${idea}\n` +
    (constraints.length > 0 ? `\n${constraints.join('\n')}\n` : '') +
    `\nReturn only lyrics with section tags on their own lines.`;

  const result = await minimaxChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    // Higher cap to leave room for reasoning models (e.g. MiniMax-M2) that
    // emit a chain-of-thought before the final lyrics.
    maxTokens: 4000,
    temperature: 0.85,
  });

  return { lyrics: result.text.trim(), raw: result.raw };
}

// ─── Vibe reference translator ────────────────────────────

// Turn user-provided artist/band names into descriptive musical attributes.
// This is much more effective than passing raw artist names to the music
// model: providers often filter/reject named-artist prompts on copyright
// grounds, and even when accepted the model may not "know" the reference.
// Translating to instrument/production cues yields better, safer results.
export async function minimaxTranslateVibeReference(
  vibeReference: string
): Promise<string> {
  const trimmed = vibeReference.trim();
  if (!trimmed) return '';

  const system =
    `You are a music producer translating artist references into specific musical attributes. ` +
    `When given names of artists/bands, output 6-12 short descriptors that capture their shared sound: ` +
    `instruments, production techniques, vocal qualities, rhythmic feel, mood. ` +
    `RULES: ` +
    `(1) NEVER output any artist or band names. ` +
    `(2) Output a single comma-separated list of descriptors, no other commentary. ` +
    `(3) Be specific (e.g. "warm analog tape saturation" not "good production"). ` +
    `(4) Aim for 12-25 words total.`;

  const user = `Translate these artist references into musical descriptors: ${trimmed.slice(0, 300)}`;

  const result = await minimaxChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens: 200,
    temperature: 0.6,
  });

  return result.text.trim().replace(/^["']|["']$/g, '');
}

// ─── Image generation (image-01) ──────────────────────────

export type ImageAspectRatio =
  | '1:1'
  | '16:9'
  | '4:3'
  | '3:2'
  | '2:3'
  | '3:4'
  | '9:16'
  | '21:9';

export interface ImageGenerationParams {
  prompt: string;
  model?: string;
  aspectRatio?: ImageAspectRatio;
  n?: number;
  promptOptimizer?: boolean;
  responseFormat?: 'url' | 'base64';
  subjectReference?: Array<{ type: string; image_file: string }>;
}

export interface GeneratedImage {
  url?: string;
  base64?: string;
}

export interface ImageGenerationResult {
  images: GeneratedImage[];
  traceId?: string;
  raw: unknown;
}

export async function minimaxGenerateImage(
  params: ImageGenerationParams
): Promise<ImageGenerationResult> {
  const model = params.model || process.env.MINIMAX_IMAGE_MODEL || 'image-01';
  const url = buildUrl('/image_generation');
  const responseFormat = params.responseFormat || 'url';
  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
    response_format: responseFormat,
    aspect_ratio: params.aspectRatio || '1:1',
    n: Math.min(Math.max(params.n || 1, 1), 9),
  };
  if (params.promptOptimizer != null) body.prompt_optimizer = params.promptOptimizer;
  if (params.subjectReference?.length) body.subject_reference = params.subjectReference;

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax image generation HTTP error', {
      status: res.status,
      model,
      body: errText.slice(0, 500),
    });
    if (res.status === 429) {
      throw new MinimaxRateLimitError(429, `MiniMax image generation rate-limited (${res.status})`);
    }
    throw new Error(`MiniMax image generation failed (${res.status})`);
  }

  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    const code = baseResp.status_code as number;
    const msg = baseResp.status_msg || 'unknown';
    if (MINIMAX_RATE_LIMIT_CODES.has(code)) {
      throw new MinimaxRateLimitError(code, `MiniMax image generation error ${code}: ${msg}`);
    }
    throw new Error(`MiniMax image generation error ${code}: ${msg}`);
  }

  const data = json?.data || {};
  const urls: string[] = Array.isArray(data.image_urls) ? data.image_urls : [];
  const base64s: string[] = Array.isArray(data.image_base64) ? data.image_base64 : [];
  const images: GeneratedImage[] =
    urls.length > 0
      ? urls.map((u) => ({ url: u }))
      : base64s.map((b) => ({ base64: b }));

  if (images.length === 0) {
    logger.warn('MiniMax image generation returned no images', { raw: json });
  }

  return { images, traceId: json?.trace_id, raw: json };
}

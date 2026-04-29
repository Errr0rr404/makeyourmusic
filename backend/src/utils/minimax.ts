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
  const model = params.model || process.env.MINIMAX_MUSIC_MODEL || 'music-2.6-free';
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
  if (params.lyricsOptimizer != null) body.lyrics_optimizer = params.lyricsOptimizer;
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
      body: errText.slice(0, 500),
    });
    throw new Error(`MiniMax music generation failed (${res.status})`);
  }

  const json = await parseJson<any>(res);
  const baseResp = json?.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    throw new Error(
      `MiniMax music generation error ${baseResp.status_code}: ${baseResp.status_msg || 'unknown'}`
    );
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
}

export interface VideoStartResult {
  taskId: string;
  raw: unknown;
}

export async function minimaxStartVideo(params: VideoStartParams): Promise<VideoStartResult> {
  const model = params.model || process.env.MINIMAX_VIDEO_MODEL || 'video-01';
  const url = buildUrl('/video_generation');
  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
  };
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
  mood?: string;
  language?: string;
  style?: string;
}

export async function minimaxGenerateLyrics(params: LyricsParams): Promise<{
  lyrics: string;
  raw: unknown;
}> {
  const { idea, genre, mood, language = 'English', style } = params;
  const constraints: string[] = [];
  if (genre) constraints.push(`Genre: ${genre}`);
  if (mood) constraints.push(`Mood: ${mood}`);
  if (style) constraints.push(`Style: ${style}`);

  const system =
    `You are a talented songwriter. Write original song lyrics in ${language} that are evocative, radio-ready, and emotionally resonant. ` +
    `Use clear structure tags on their own lines: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro]. ` +
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

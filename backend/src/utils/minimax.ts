import logger from './logger';

const DEFAULT_BASE = 'https://api.minimax.io/v1';
// 240s — generous enough for MiniMax's instrumental generation status query
// (regularly >120s for long-form post-rock / math-rock / doom instrumentals)
// while still bounding the worst-case worker hang well below the OS TCP
// timeout. 120s was too tight and reliably failed multi-minute instrumentals.
const DEFAULT_TIMEOUT_MS = 240_000;

// Wrap fetch with a default abort timeout. Without this, a stuck MiniMax
// endpoint hangs the worker until the OS-level TCP timeout (60s+ to 30min),
// which back-pressures every Express handler that hits this util.
function minimaxFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs, ...rest } = init;
  return fetch(url, {
    ...rest,
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
}

// Strip Bearer tokens from any provider-echoed body before logging — defends
// against a future MiniMax response that mirrors back the Authorization header.
function safeBody(text: string): string {
  return text.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]').slice(0, 500);
}

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
  const res = await minimaxFetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax chat failed', { status: res.status, body: safeBody(errText) });
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
// 1042 daily-quota / model-quota exhausted). 2013 (invalid model) was previously
// included but is a permanent condition — retrying with the same id loops
// forever, and a fallback chain has its own out-of-band fallback logic.
export const MINIMAX_RATE_LIMIT_CODES = new Set([1002, 1039, 1042]);

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

  const res = await minimaxFetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax music generation HTTP error', {
      status: res.status,
      model,
      body: safeBody(errText),
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

  const res = await minimaxFetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax video start HTTP error', {
      status: res.status,
      body: safeBody(errText),
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
  const res = await minimaxFetch(url, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax video query HTTP error', {
      status: res.status,
      body: safeBody(errText),
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
  const res = await minimaxFetch(url, { method: 'GET', headers: buildHeaders() });
  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax file retrieve HTTP error', {
      status: res.status,
      body: safeBody(errText),
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
  durationSec?: number;
  bpm?: number;
  musicalKey?: string;
  styleContext?: string;
  // Optional brief from the orchestration planner: emotional arc, perspective,
  // imagery seeds, hooks. When present, we trust this as the primary direction
  // and treat `idea` as raw context.
  lyricsBrief?: string;
  // Optional draft hook line from the orchestration planner. When present we
  // anchor the chorus around it.
  hookLine?: string;
  // Optional pre-resolved lyric convention (rhyme/voice/structure/length).
  // Caller can pass this from the catalog to avoid re-deriving in the prompt.
  conventionRhyme?: string;
  conventionVoice?: string;
  conventionStructure?: string;
  conventionLengthHint?: string;
  /**
   * Per-genre craft paragraph from the catalog. Describes WHAT good looks like
   * for this genre's audience (literary depth vs. flow vs. hook-craft, etc.).
   * Resolved by `lookupQualityTierGuidance(convention.quality)` in the caller.
   */
  conventionQualityGuidance?: string;
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
    durationSec,
    bpm,
    musicalKey,
    styleContext,
    lyricsBrief,
    hookLine,
    conventionRhyme,
    conventionVoice,
    conventionStructure,
    conventionLengthHint,
    conventionQualityGuidance,
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
  if (typeof durationSec === 'number' && Number.isFinite(durationSec)) {
    constraints.push(`Target song length: ${Math.round(durationSec)} seconds`);
  }
  if (typeof bpm === 'number' && Number.isFinite(bpm)) {
    constraints.push(`Tempo: ${Math.round(bpm)} BPM`);
  }
  if (musicalKey) constraints.push(`Key: ${musicalKey}`);

  // Genre-specific lyric conventions, when supplied by the controller from the
  // catalog. These give the model concrete rhyme/voice/structure/density cues
  // instead of the generic "match the genre" instruction. Note: density, not
  // word count — we deliberately do NOT push the model toward a target length.
  const conventionLines: string[] = [];
  if (conventionRhyme) conventionLines.push(`- Rhyme + meter: ${conventionRhyme}`);
  if (conventionVoice) conventionLines.push(`- Voice + imagery: ${conventionVoice}`);
  if (conventionStructure) conventionLines.push(`- Structure to follow: ${conventionStructure}`);
  if (conventionLengthHint) conventionLines.push(`- Density guidance: ${conventionLengthHint}`);
  const conventionBlock = conventionLines.length
    ? `\nGENRE CONVENTIONS (use as guidance, not as a quota):\n${conventionLines.join('\n')}\n`
    : '';

  // Per-genre quality bar. Resolved by the caller from
  // lookupQualityTierGuidance(convention.quality). When absent we fall back to
  // a generic "literary" paragraph so the bar never collapses to nothing.
  const qualityBlock = conventionQualityGuidance
    ? `\nQUALITY BAR FOR THIS GENRE:\n${conventionQualityGuidance}\n`
    : '';

  // The MiniMax music model sings whatever is in the `lyrics` field — including
  // parenthetical stage directions and tags like [Guitar Solo]. The system
  // prompt has to forbid those explicitly; downstream code also runs a
  // sanitizer pass as a defense in depth.
  //
  // Structure: lead with CRAFT (every line earns its place, length follows
  // substance) → genre-specific QUALITY BAR → conventions → formatting. We
  // intentionally do not give a target word count: padding to hit a length is
  // the most common cause of weak lyrics. Better a tight 12 lines that land
  // than a wandering 40.
  const system =
    `You are a professional songwriter writing original SUNG lyrics in ${language}. Your job is to write lyrics that EARN their place in the song — every line must carry meaning, image, or emotional weight. Padding to fill bars or hit a length is forbidden: if the idea is fully expressed in 8 lines, write 8; if it needs 24, write 24. Length follows substance, not the other way around.` +
    `\n\nCORE CRAFT PRINCIPLES (apply to every line):` +
    `\n• Every line must do at least one of: (1) advance the emotional arc, (2) deliver a concrete image, (3) reveal character, situation, or stakes, (4) land a memorable hook, (5) provide a deliberate breath/refrain. Lines that do none of these are filler — cut them, do not pad.` +
    `\n• Specific beats vague. "The kitchen light at 2am" beats "we were up so late". Use concrete sensory detail (sight, sound, body, place, object, weather, dialogue). Avoid generic abstractions ("dreams", "soul", "heart", "fire", "light", "shine", "forever") unless they are anchored to something specific.` +
    `\n• Maintain a consistent narrator, tense, and emotional logic unless an intentional shift is part of the arc. Verse 2 must NOT just restate Verse 1 in new words — it should advance the story or deepen the feeling.` +
    `\n• The chorus must be repeatable verbatim — it IS the song's hook and should appear identically each time it returns (Final Chorus may add one extra line or "(yeah)" ad-libs but stays recognizably the same).` +
    `\n• The final chorus or outro must pay off the emotional arc — do not simply reprise Verse 1's sentiment unchanged.` +
    `\n• AVOID worn clichés (neon lights, chasing dreams, heart of gold, tear-stained, fire in my veins, light up the sky, stars align, unbreak my heart, wings to fly, on cloud nine) unless explicitly requested. They signal generic AI output and an audience that knows the genre will dismiss the song instantly.` +
    `\n• Rhyme is for service, not for show: never sacrifice meaning to land a rhyme. A near-rhyme that is true beats a perfect rhyme that is hollow.` +
    `\n• Match line lengths to the genre's natural vocal cadence, but let the meaning of the line determine its length — never artificially shorten or stretch a line to hit a meter target. There is no cap on words per line.` +
    qualityBlock +
    `\nLENGTH POLICY: Whatever the idea needs. The genre conventions describe typical density; treat them as guidance, not as a quota. Better a tight, meaningful 12 lines than a wandering 40. If you cannot write something true and specific for the next line, end the section instead of padding.` +
    `\n\nFORMATTING (these are HARD constraints — the lyrics are fed directly into a music model that will SING anything you write):` +
    `\n1. Use ONLY these section tags on their own lines: [Intro], [Verse 1], [Verse 2], [Verse 3], [Pre-Chorus], [Chorus], [Post-Chorus], [Hook], [Refrain], [Bridge], [Final Chorus], [Outro].` +
    `\n2. NEVER write [Guitar Solo], [Instrumental], [Breakdown], [Drum Fill], or any other instrumental-section tag — instrumental sections are decided by the producer, not by you.` +
    `\n3. NEVER write parenthetical stage directions or production cues like "(Hammond swell, hi-hat pulse)", "(Tape hiss, finger-picked guitar)", "(808 hit, strings enter)". The model would sing those words.` +
    `\n4. Parentheses are allowed ONLY for short vocal ad-libs that are meant to be sung: "(woah)", "(yeah)", "(oh-oh-oh)". Never list instruments, drums, effects, or production techniques inside parentheses.` +
    `\n5. Avoid copyrighted lyrics. Output ONLY the lyrics — no commentary, no explanations, no production notes before or after. Every non-tag line must be singable text.`;

  const briefBlock = lyricsBrief?.trim()
    ? `Direction from the orchestration planner (theme, voice, imagery, hooks):\n${lyricsBrief.trim()}\n`
    : '';
  const hookBlock = hookLine?.trim()
    ? `Suggested hook / chorus line (anchor the chorus around this — keep it or refine it, but use the same hook each time the chorus returns):\n"${hookLine.trim()}"\n`
    : '';
  const styleContextBlock = styleContext?.trim()
    ? `Producer style context (use this to choose lyric cadence, density, section length, rhyme shape, and hook contour — do NOT write instrument cues or production notes as lyrics):\n${styleContext.trim()}\n`
    : '';

  const user =
    `Write a song about: ${idea}\n` +
    (styleContextBlock ? `\n${styleContextBlock}` : '') +
    (briefBlock ? `\n${briefBlock}` : '') +
    (hookBlock ? `\n${hookBlock}` : '') +
    (conventionBlock ? `${conventionBlock}` : '') +
    (constraints.length > 0 ? `\n${constraints.join('\n')}\n` : '') +
    `\nReturn only lyrics with section tags on their own lines. Every line must earn its place — never pad to hit a length. The chorus must be identical (or near-identical) each time it appears. NO parenthetical stage directions, NO instrument cues, NO [Guitar Solo]-style tags.`;

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

// ─── Orchestration planner ────────────────────────────────

export interface OrchestrationInput {
  idea?: string | null;
  title?: string | null;
  genre?: string | null;
  subGenre?: string | null;
  mood?: string | null;
  energy?: string | null;
  era?: string | null;
  vocalStyle?: string | null;
  vibeReference?: string | null;
  style?: string | null;
  isInstrumental?: boolean;
  language?: string;
  durationSec?: number | null;
  bpm?: number | null;
  key?: string | null;
}

export interface SectionGuideEntry {
  /** Section name — exact match from structure array (e.g. "Verse", "Chorus", "Bridge"). */
  section: string;
  /** Relative energy for this section. */
  energy: 'low' | 'medium' | 'high' | 'peak';
  /** One-word mood descriptor for the section (e.g. "vulnerable", "euphoric", "building"). */
  mood: string;
  /** Arrangement density for this section. */
  density: 'sparse' | 'building' | 'full' | 'stripped';
}

export interface OrchestrationPlan {
  workingTitle: string;
  refinedConcept: string;
  genre: string;
  subGenre: string | null;
  bpm: number | null;
  key: string | null;
  timeSignature: string | null;
  energyArc: string;
  instrumentation: string[];
  vocalDirection: string | null;
  productionNotes: string;
  structure: string[];
  vibeDescriptors: string;
  musicPrompt: string;
  lyricsBrief: string;
  /** A draft of the chorus / hook line — short, memorable, sing-able. */
  hookLine?: string | null;
  /** Coarse arrangement arc, e.g. "soft intro → builds at chorus → stripped bridge → big final chorus". */
  arrangementArc?: string | null;
  /** Per-section energy/mood/density guide — shapes dynamics across the song arc. */
  sectionGuide?: SectionGuideEntry[] | null;
}

function parseOrchestrationJson(text: string): OrchestrationPlan {
  // Strip markdown fences if the model wrapped the JSON in ```.
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Orchestration response did not contain JSON');
  }
  const parsed = JSON.parse(stripped.slice(start, end + 1));
  const arrOfStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  const stringOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v : null;
  const stringOr = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v : fallback;
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  return {
    workingTitle: stringOr(parsed.workingTitle),
    refinedConcept: stringOr(parsed.refinedConcept),
    genre: stringOr(parsed.genre),
    subGenre: stringOrNull(parsed.subGenre),
    bpm: numOrNull(parsed.bpm),
    key: stringOrNull(parsed.key),
    timeSignature: stringOrNull(parsed.timeSignature),
    energyArc: stringOr(parsed.energyArc),
    instrumentation: arrOfStrings(parsed.instrumentation),
    vocalDirection: stringOrNull(parsed.vocalDirection),
    productionNotes: stringOr(parsed.productionNotes),
    structure: arrOfStrings(parsed.structure),
    vibeDescriptors: stringOr(parsed.vibeDescriptors),
    musicPrompt: stringOr(parsed.musicPrompt),
    lyricsBrief: stringOr(parsed.lyricsBrief),
    hookLine: stringOrNull(parsed.hookLine),
    arrangementArc: stringOrNull(parsed.arrangementArc),
    sectionGuide: (() => {
      if (!Array.isArray(parsed.sectionGuide)) return null;
      const valid = parsed.sectionGuide
        .filter((s: unknown) => s && typeof s === 'object')
        .map((s: Record<string, unknown>) => ({
          section: typeof s.section === 'string' ? s.section : '',
          energy: (['low', 'medium', 'high', 'peak'] as const).includes(s.energy as any)
            ? (s.energy as SectionGuideEntry['energy'])
            : 'medium',
          mood: typeof s.mood === 'string' ? s.mood : '',
          density: (['sparse', 'building', 'full', 'stripped'] as const).includes(s.density as any)
            ? (s.density as SectionGuideEntry['density'])
            : 'full',
        }))
        .filter((s: SectionGuideEntry) => s.section && s.mood);
      return valid.length > 0 ? valid : null;
    })(),
  };
}

// Genre priors used to anchor the orchestration planner. We embed this table
// in the system prompt so the model picks coherent BPM/structure/instrument
// defaults instead of free-improvising. Values reflect mainstream conventions
// and are deliberately ranges rather than fixed numbers.
const ORCHESTRATION_GENRE_PRIORS = `
GENRE PRIORS (use as defaults — override only if the user concept clearly demands otherwise):
- Pop: 90-128 BPM, major or minor, 4/4. Verse-PreChorus-Chorus form, hook-forward chorus, 5-8 instruments. Vocals: clean modern pop topline.
- Hip Hop: 70-95 BPM (boom-bap, conscious) or 130-160 BPM (trap half-time = 70-80 perceived). 4/4. 16-bar verse + 8-bar hook. 4-7 instruments centered on 808/drums. Vocals: rap cadence.
- Trap: 130-160 BPM written (70-80 felt at half-time). 808 sub, hi-hat triplets, dark melodic synths. Hook-driven.
- Melodic Rap / Emo Rap: 70-90 BPM (half-time). Sung melodic hook over trap beats. 4-6 instruments. Vocals: melodic auto-tuned.
- Drill: 140 BPM. Sliding 808 basslines, syncopated hats, ominous piano/strings. Verse-Hook.
- Rock: 90-150 BPM, 4/4. Verse-Chorus-Verse-Chorus-Bridge form, anthemic chorus. 4-6 instruments (guitar/bass/drums/vocals + optional keys/synth).
- Emo: 120-160 BPM, 4/4. Verse-PreChorus-Chorus form, loud quiet dynamic. 4-6 instruments. Vocals: confessional clean.
- Post-Hardcore: 120-170 BPM, 4/4. Verse-Chorus with screamed/clean contrast. 4-6 instruments. Vocals: alternating scream/clean.
- Nu-Metal: 80-140 BPM, 4/4. Verse-Chorus with breakdown. 5-7 instruments. Vocals: rap/scream/clean alternating.
- R&B: 70-105 BPM, often 6/8 or 4/4 with swung 16ths. Verse-PreChorus-Chorus form. 5-8 instruments. Vocals: melismatic, expressive.
- Electronic / Dance: 118-130 BPM (house/disco), 130-145 BPM (techno/trance), 140-180 BPM (drum & bass). 4/4. Build-Drop form, sparse vocals if any. 4-8 sound-design layers.
- Trip-Hop: 70-90 BPM. Downtempo breakbeats, atmospheric bass, cinematic samples. 4-6 layers. Vocals: sparse, detached.
- Darkwave / Post-Punk: 100-140 BPM. Synths + minimal guitar, cold production. 4-6 instruments. Vocals: brooding baritone or detached.
- Indie: 95-130 BPM, 4/4. Verse-Chorus form. 4-6 instruments centered on guitars + lo-fi sheen.
- Folk: 70-110 BPM, 4/4 or 6/8. Strophic Verse-Refrain form. 2-5 instruments centered on acoustic guitar.
- Jazz: 60-220 BPM (genre-dependent: ballad → bebop). Often 4/4 swung or 3/4. AABA standard or head-solos-head form. 3-6 instruments.
- Classical: 40-180 BPM range, varied time signatures. Through-composed or sonata form. 3-15+ instruments. No drum kit.
- Lo-Fi: 70-95 BPM, 4/4. Loop-based, sparse vocals. 3-5 instruments with tape/vinyl coloration.
- Metal: 100-200 BPM, 4/4 or odd meters. Verse-Chorus form, palm-muted riffs. 4-6 instruments centered on distorted guitars + double-kick drums.
- Country: 80-130 BPM, 4/4 or shuffle. Verse-Chorus form. 4-7 instruments centered on acoustic+electric guitar + steel/fiddle.
- Soul / Funk: 85-115 BPM, 4/4. Verse-Chorus or vamp form. 5-9 instruments with horns + tight rhythm section.
- Reggae: 60-90 BPM, 4/4 with one-drop or rockers feel. Verse-Chorus form. 4-7 instruments.
- World: genre-authentic regional defaults. Use traditional instruments + meter for the named subgenre.
- Cinematic: through-composed build-and-release. No pop chorus required. Tempo set by emotion (60-140 BPM). 5-12+ orchestral/hybrid layers.

INSTRUMENTATION COUNT: pick from the genre's range above. Cinematic/orchestral: 8-14. Pop/Rock/R&B: 5-8. Folk/Lo-Fi/Singer-songwriter: 2-5. Ambient/Drone: 2-4.

ERA-BASED PRODUCTION TEXTURE (add to musicPrompt when era is specified):
- Vintage / pre-60s: mono mix, spring reverb, 78rpm tape hiss, primitive room sound, intimate lo-fi.
- 60s: early-stereo or mono, plate reverb, close-mic vintage rooms, tambourine and handclap transients.
- 70s: warm analog tape saturation, live-room mic placement, vintage tube compression, thick organic low-end.
- 80s: gated reverb on snare, big digital reverb tails, analog synths + early digital hybrid, neon production gloss.
- 90s: 44.1kHz digital crispness, sample-based dusty drums, chunky compressed mixes, early digital brightness.
- 2000s: polished digital loudness, triggered drum replacements, punchy radio-compressed mixes.
- Modern / 2010s+: streaming-optimized loudness, heavy low-end, trap transient clarity, DSP detail.
`;

// Pre-music orchestration: turn raw user inputs into a coherent production
// plan (genre, BPM, key, structure, instrumentation, vocal direction, ready-
// to-feed music prompt, and a lyrics brief). The result drives both the lyric
// generator and the music-generation prompt.
export async function minimaxOrchestrate(
  input: OrchestrationInput
): Promise<OrchestrationPlan> {
  const language = input.language || 'English';
  const isInstrumental = !!input.isInstrumental;

  const inputs: string[] = [];
  if (input.idea) inputs.push(`User concept: ${input.idea.slice(0, 1500)}`);
  if (input.title) inputs.push(`Working title: ${input.title}`);
  if (input.genre) {
    inputs.push(
      `Genre: ${input.genre}${input.subGenre ? ` / ${input.subGenre}` : ''}`
    );
  }
  if (input.mood) inputs.push(`Mood: ${input.mood}`);
  if (input.energy) inputs.push(`Energy: ${input.energy}`);
  if (input.era) inputs.push(`Era: ${input.era}`);
  if (!isInstrumental && input.vocalStyle) {
    inputs.push(`Vocal style: ${input.vocalStyle}`);
  }
  if (input.vibeReference) {
    inputs.push(`Vibe reference (artists/sounds): ${input.vibeReference}`);
  }
  if (input.style) inputs.push(`Extra style notes: ${input.style}`);
  if (typeof input.durationSec === 'number' && Number.isFinite(input.durationSec)) {
    inputs.push(`Target duration: ${Math.round(input.durationSec)} seconds`);
  }
  if (typeof input.bpm === 'number' && Number.isFinite(input.bpm)) {
    inputs.push(`User-pinned tempo: ${Math.round(input.bpm)} BPM`);
  }
  if (input.key) inputs.push(`User-pinned key: ${input.key}`);
  inputs.push(`Has lyrics: ${isInstrumental ? 'no (instrumental)' : 'yes'}`);

  const system =
    `You are a music producer and orchestration director. Given a user's raw song request, produce a complete orchestration plan as JSON. ` +
    `You are reasoning about HOW the song should be produced — instruments, arrangement, structure, vocal direction — BEFORE any lyric or audio generation runs. ` +
    `\n\nRULES: ` +
    `\n(1) Translate any artist/band references into specific musical descriptors (instruments, production techniques, vocal qualities). NEVER output artist or band names anywhere in the JSON. ` +
    `\n(2) Treat explicit user style fields (genre, subgenre, mood, energy, era, vocal style, extra style notes, tempo, key, duration) as constraints. If a field is missing, infer the most coherent default from the concept and the GENRE PRIORS table; do not ask follow-up questions and do not collapse to generic pop unless the concept points there. ` +
    `\n(3) Pick a coherent BPM, key, and time signature that fit the genre/mood. Respect user-pinned tempo/key when supplied. Use the GENRE PRIORS table below as your default — only deviate when the user concept clearly justifies it. ` +
    `\n(4) The structure must match the named genre's conventions: hook-driven Verse-PreChorus-Chorus for pop/rock/R&B, 16-bar Verse + 8-bar Hook for hip-hop, Build-Drop for dance/electronic, strophic Verse-Refrain for folk/singer-songwriter, AABA for classic jazz, through-composed build-and-release for cinematic. Do not impose pop-form on genres that don't use it. ` +
    `\n(5) "musicPrompt" is fed verbatim to a music-generation model. Write it as a dense, comma-separated production brief covering genre, BPM, key, instrumentation, vocal direction, energy arc, and era. Do NOT include lyrics, section headings, or stage directions in musicPrompt. Lead with the most genre-defining instruments. ` +
    `\n(6) "lyricsBrief" is a craft brief for the lyric writer. It must articulate WHY this song matters to write — the central emotional turn or insight, not just a topic label. Include: the central concrete image or scene that anchors the song (a place, a moment, a body in a specific situation — never an abstraction); narrative perspective (1st/2nd/3rd person, present/past tense); the emotional arc from start to end (how the speaker shifts); 2-3 specific sensory or scenic seeds (objects, places, body language, weather, dialogue — not abstractions like "love" or "freedom"); the hook/refrain motif; and how the production density should shape lyric cadence. The brief must be specific enough that two writers given the same brief would produce recognizably the same song. Avoid generic prompts like "a song about love and loss" — push for the specific angle. Do NOT write the actual lyrics. ${isInstrumental ? 'For instrumental tracks, set lyricsBrief to an empty string.' : ''} ` +
    `\n(7) "hookLine" is a short draft of the chorus / refrain hook line — under 10 words, memorable, sing-able. It must land an image, feeling, or stance, not just restate the topic. Bad: "We are forever in the light." Good: "I left the porch light on for you." ${isInstrumental ? 'Set to null for instrumental tracks.' : 'Required for vocal tracks.'} ` +
    `\n(8) "instrumentation" is a list of short instrument/sound descriptors (e.g. "fingerpicked acoustic", "warm Rhodes", "brushed snare"). Choose count from the genre's range in the priors table — typically 5-8 for pop/rock/R&B, 2-5 for folk/lo-fi, 8-14 for cinematic/orchestral, 2-4 for ambient. ` +
    `\n(9) "structure" is an array of section names matching the genre. Allowed canonical names: "Intro", "Verse", "Verse 2", "Pre-Chorus", "Chorus", "Post-Chorus", "Hook", "Refrain", "Bridge", "Final Chorus", "Drop", "Build", "Breakdown", "Outro", "Vamp", "Head", "Solo Section". Do NOT use "Guitar Solo" / "Instrumental" — instrumental moments are conveyed through "Solo Section" or "Breakdown" labels. ` +
    `\n(10) "arrangementArc" is one short sentence describing the energy/density progression (e.g. "sparse intro → builds at chorus → stripped bridge → fullest final chorus"). ` +
    `\n(11) "vocalDirection" ${isInstrumental ? 'must be null (instrumental track)' : 'should describe: gender/timbre, vocal range register, delivery style (belted/whispered/rap/melodic-rap/falsetto/etc.), use of harmonies or ad-libs, and any post-processing (auto-tune, doubled, reverb character). Be specific — "warm lower-register female vocal with occasional falsetto, sparse harmonies, close-mic intimate" is useful; "female vocals" is not.'}` +
    `\n(12) "sectionGuide" is an array of per-section production cues, one entry per section in the structure array. For each section specify: section (exact name from structure), energy ("low"/"medium"/"high"/"peak"), mood (one descriptive word e.g. "vulnerable", "euphoric", "building", "release"), density ("sparse"/"building"/"full"/"stripped"). This shapes the dynamic arc — e.g. Intro: low+sparse, Verse: medium+building, Chorus: peak+full, Bridge: stripped+reflective, Final Chorus: peak+full. Omit for ambient/drone/fully-atmospheric tracks.` +
    `\n(13) Output ONLY valid JSON. No commentary, no markdown fences.\n` +
    ORCHESTRATION_GENRE_PRIORS;

  const schema =
    `{` +
    `"workingTitle": string, ` +
    `"refinedConcept": string (1-2 sentences), ` +
    `"genre": string, ` +
    `"subGenre": string | null, ` +
    `"bpm": number | null, ` +
    `"key": string | null, ` +
    `"timeSignature": string | null, ` +
    `"energyArc": string, ` +
    `"arrangementArc": string, ` +
    `"instrumentation": string[], ` +
    `"vocalDirection": ${isInstrumental ? 'null' : 'string | null'}, ` +
    `"productionNotes": string, ` +
    `"structure": string[], ` +
    `"vibeDescriptors": string (comma-separated, no artist names), ` +
    `"musicPrompt": string (dense production brief, no lyrics), ` +
    `"lyricsBrief": ${isInstrumental ? 'string (empty since instrumental)' : 'string'}, ` +
    `"hookLine": ${isInstrumental ? 'null' : 'string'}, ` +
    `"sectionGuide": Array<{section: string, energy: "low"|"medium"|"high"|"peak", mood: string, density: "sparse"|"building"|"full"|"stripped"}> | null` +
    `}`;

  const user =
    `Inputs:\n${inputs.join('\n')}\n\n` +
    `Output language for any lyric brief: ${language}\n\n` +
    `Return JSON matching this schema:\n${schema}`;

  const result = await minimaxChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    // Bumped to fit hookLine + arrangementArc fields and the longer system
    // prompt with genre priors. Reasoning models still occasionally need head-
    // room before emitting the final JSON.
    maxTokens: 2200,
    temperature: 0.7,
  });

  return parseOrchestrationJson(result.text);
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

  const res = await minimaxFetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('MiniMax image generation HTTP error', {
      status: res.status,
      model,
      body: safeBody(errText),
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

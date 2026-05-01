// @music4ai/sdk
//
// Tiny, dependency-free TypeScript client for the music4ai public API.
// Designed to feel similar to the OpenAI / Anthropic SDKs so anyone who has
// used those can drop this in.
//
// Usage:
//   import { Music4AI } from "@music4ai/sdk";
//   const client = new Music4AI({ apiKey: process.env.MUSIC4AI_KEY });
//   const gen = await client.music.generate({ prompt: "lofi beat 80bpm", isInstrumental: true });
//   const final = await client.music.waitFor(gen.generation.id);
//
// All methods throw `Music4AIError` with `.status` + `.body` on non-2xx.

const DEFAULT_BASE = 'https://api.music4ai.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);
const MAX_RETRIES = 3;
const SDK_VERSION = '0.1.0';

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  userAgent?: string;
}

const SENSITIVE_KEY_RE = /^(authorization|x-api-key|cookie|set-cookie|api[_-]?key|bearer|password|secret|token)$/i;

function scrubSensitive(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') {
    return value.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]');
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrubSensitive(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = scrubSensitive(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export class Music4AIError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'Music4AIError';
    Object.setPrototypeOf(this, Music4AIError.prototype);
    this.status = status;
    this.body = scrubSensitive(body);
  }
}

export interface GenerateMusicInput {
  prompt?: string;
  lyrics?: string;
  idea?: string;
  genre?: string;
  subGenre?: string;
  mood?: string;
  energy?: string;
  era?: string;
  vocalStyle?: string;
  vibeReference?: string;
  durationSec?: number;
  isInstrumental?: boolean;
}

export interface GenerationStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  audioUrl?: string | null;
  errorMessage?: string | null;
  durationSec?: number | null;
  prompt?: string | null;
  lyrics?: string | null;
  coverArt?: string | null;
  provider?: string | null;
  title?: string | null;
}

export interface LyricsResponse {
  lyrics: string | null;
  plan?: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Music4AI {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;
  private userAgent: string;

  constructor(opts: ClientOptions) {
    if (!opts.apiKey) throw new Error('apiKey is required');
    const fetchImpl = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!fetchImpl) {
      throw new Error(
        'No fetch implementation found. Pass `fetchImpl` (e.g. node-fetch or undici) for environments without a global fetch.',
      );
    }
    this.apiKey = opts.apiKey;
    let base = (opts.baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
    base = base.replace(/\/api\/v1$/, '');
    this.baseUrl = base;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
    this.userAgent = opts.userAgent || `music4ai-sdk/${SDK_VERSION}`;
  }

  private async request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
            'X-Client': this.userAgent,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await sleep(Math.min(1000 * 2 ** attempt, 8000));
          continue;
        }
        throw err;
      }

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const parsed = isJson ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
          const retryAfter = Number(res.headers.get('retry-after'));
          const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 30_000)
            : Math.min(1000 * 2 ** attempt, 8000);
          await sleep(delayMs);
          continue;
        }
        throw new Music4AIError(res.status, `Music4AI ${method} ${path} failed (${res.status})`, parsed);
      }

      if (!isJson) {
        throw new Music4AIError(
          res.status,
          `Music4AI ${method} ${path} returned non-JSON response (content-type: ${contentType || 'unknown'})`,
          null,
        );
      }
      return parsed as T;
    }
    throw lastError ?? new Music4AIError(0, 'Request failed after retries', null);
  }

  /** Lyrics-only fast path. Synchronous response. */
  lyrics = {
    generate: (input: { idea: string; genre?: string; mood?: string; language?: string }) =>
      this.request<LyricsResponse>('POST', '/lyrics', input),
  };

  /** Music generation. `generate` enqueues; use `wait` or poll `get`. */
  music = {
    generate: (input: GenerateMusicInput) =>
      this.request<{ generation: GenerationStatus }>('POST', '/music/generate', input),
    get: (id: string) =>
      this.request<{ generation: GenerationStatus }>('GET', `/music/generations/${id}`),
    /** Poll until status is COMPLETED or FAILED. */
    waitFor: async (id: string, opts: { intervalMs?: number; timeoutMs?: number } = {}) => {
      const interval = opts.intervalMs && opts.intervalMs > 0 ? opts.intervalMs : 5_000;
      const timeoutMs = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : 5 * 60_000;
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const { generation } = await this.music.get(id);
        if (generation.status === 'COMPLETED' || generation.status === 'FAILED') return generation;
        await sleep(interval);
      }
      throw new Music4AIError(408, `Generation ${id} did not complete in time`, null);
    },
  };
}

export default Music4AI;

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

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class Music4AIError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
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
}

export class Music4AI {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(opts: ClientOptions) {
    if (!opts.apiKey) throw new Error('apiKey is required');
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl || fetch;
  }

  private async request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = res.headers.get('content-type') || '';
    const json = contentType.includes('application/json') ? await res.json() : null;
    if (!res.ok) {
      throw new Music4AIError(res.status, `Music4AI ${method} ${path} failed (${res.status})`, json);
    }
    return json as T;
  }

  /** Lyrics-only fast path. Synchronous response. */
  lyrics = {
    generate: (input: { idea: string; genre?: string; mood?: string; language?: string }) =>
      this.request<{ lyrics: string }>('POST', '/lyrics', input),
  };

  /** Music generation. `generate` enqueues; use `wait` or poll `get`. */
  music = {
    generate: (input: GenerateMusicInput) =>
      this.request<{ generation: GenerationStatus }>('POST', '/music/generate', input),
    get: (id: string) =>
      this.request<{ generation: GenerationStatus }>('GET', `/music/generations/${id}`),
    /** Poll until status is COMPLETED or FAILED. */
    waitFor: async (id: string, opts: { intervalMs?: number; timeoutMs?: number } = {}) => {
      const interval = opts.intervalMs ?? 5_000;
      const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
      while (Date.now() < deadline) {
        const { generation } = await this.music.get(id);
        if (generation.status === 'COMPLETED' || generation.status === 'FAILED') return generation;
        await new Promise((r) => setTimeout(r, interval));
      }
      throw new Music4AIError(408, `Generation ${id} did not complete in time`, null);
    },
  };
}

export default Music4AI;

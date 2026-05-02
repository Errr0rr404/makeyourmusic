export interface ClientOptions {
    apiKey: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    userAgent?: string;
}
export declare class Music4AIError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, message: string, body: unknown);
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
export declare class Music4AI {
    private apiKey;
    private baseUrl;
    private fetchImpl;
    private timeoutMs;
    private userAgent;
    constructor(opts: ClientOptions);
    private request;
    /** Lyrics-only fast path. Synchronous response. */
    lyrics: {
        generate: (input: {
            idea: string;
            genre?: string;
            mood?: string;
            language?: string;
        }) => Promise<LyricsResponse>;
    };
    /** Music generation. `generate` enqueues; use `wait` or poll `get`. */
    music: {
        generate: (input: GenerateMusicInput) => Promise<{
            generation: GenerationStatus;
        }>;
        get: (id: string) => Promise<{
            generation: GenerationStatus;
        }>;
        /** Poll until status is COMPLETED or FAILED. */
        waitFor: (id: string, opts?: {
            intervalMs?: number;
            timeoutMs?: number;
        }) => Promise<GenerationStatus>;
    };
}
export default Music4AI;

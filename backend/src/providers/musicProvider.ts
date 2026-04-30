// Music generation provider interface.
//
// Concrete impls: minimax (default, primary), suno (fallback when key set),
// stableAudio (fallback for instrumental). The provider chosen for a given
// generation is decided by getMusicProvider() — usually the env-configured
// PRIMARY, with PROVIDER_FALLBACK_CHAIN in env for graceful degradation.
//
// Adding a new provider: implement MusicProvider, add to providerRegistry,
// optionally add an env key check. No changes needed in the controller.

export interface MusicGenParams {
  prompt?: string;
  lyrics?: string;
  isInstrumental?: boolean;
  // Cover / extension mode — provider conditions on this audio
  audioUrl?: string;
  audioBase64?: string;
  durationSec?: number;
  audioSetting?: {
    sampleRate?: number;
    bitrate?: number;
    format?: 'mp3' | 'wav' | 'pcm';
  };
}

export interface MusicGenResult {
  audioUrl?: string;
  audioHex?: string;
  durationSec?: number;
  traceId?: string;
  raw: unknown;
}

export interface MusicProvider {
  /** Stable id used in DB (`MusicGeneration.provider`). */
  readonly id: string;
  /** True if provider has the credentials needed to be invoked. */
  isConfigured(): boolean;
  /** Default model for this provider when caller didn't pin one. */
  defaultModel(): string;
  /** Generate music. Throw on failure; rate limits should throw a typed error. */
  generate(params: MusicGenParams & { model?: string }): Promise<MusicGenResult>;
  /** True when the provider can do audio-conditioned (cover/extension) gen. */
  supportsCoverMode(): boolean;
  /** True when the provider supports rate-limit-driven model fallback within itself. */
  supportsModelFallback(): boolean;
}

export class ProviderNotConfiguredError extends Error {
  constructor(providerId: string) {
    super(`Music provider "${providerId}" is not configured`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderRateLimitError extends Error {
  code: number;
  providerId: string;
  constructor(providerId: string, code: number, message: string) {
    super(message);
    this.code = code;
    this.providerId = providerId;
    this.name = 'ProviderRateLimitError';
  }
}

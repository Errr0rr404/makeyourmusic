import {
  MusicGenParams,
  MusicGenResult,
  MusicProvider,
  ProviderNotConfiguredError,
} from './musicProvider';

// Stability AI Stable Audio provider. Strong on instrumental + ambient,
// useful as a fallback for instrumental generations when MiniMax is rate
// limited. Does NOT support vocals — the registry steers vocal requests away.
//
// Wire this in once STABILITY_API_KEY is set.
export class StableAudioProvider implements MusicProvider {
  readonly id = 'stableAudio';

  isConfigured(): boolean {
    // Keep this provider out of selection until the REST integration below is
    // implemented. Env vars alone should not make the registry pick a stub.
    return false;
  }

  defaultModel(): string {
    return process.env.STABILITY_AUDIO_MODEL || 'stable-audio-2.0';
  }

  supportsCoverMode(): boolean {
    return false;
  }

  supportsModelFallback(): boolean {
    return false;
  }

  async generate(params: MusicGenParams & { model?: string }): Promise<MusicGenResult> {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError(this.id);
    if (params.lyrics && !params.isInstrumental) {
      throw new Error('Stable Audio does not support vocals; pass isInstrumental:true or pick another provider');
    }
    // TODO: implement Stability REST call once a key is provided. The bones
    // are here so the registry exposes a real, identifiable provider.
    throw new ProviderNotConfiguredError(this.id);
  }
}

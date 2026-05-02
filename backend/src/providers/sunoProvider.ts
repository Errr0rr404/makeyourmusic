import {
  MusicGenParams,
  MusicGenResult,
  MusicProvider,
  ProviderNotConfiguredError,
} from './musicProvider';

// Suno API provider — gated on SUNO_API_KEY. Exact endpoint shape varies by
// the third-party gateway you go through (Suno's own API has been in private
// beta; sunoapi.org and suno-api.com are the current paid third parties).
//
// Implementation is intentionally minimal until a gateway is chosen:
//   1. Sign request with bearer token.
//   2. POST title + lyrics + style tags.
//   3. Poll the returned job id until status=complete.
//   4. Resolve audio URL from the response.
//
// Wire this in once SUNO_API_KEY + SUNO_API_BASE are set in Railway.
export class SunoProvider implements MusicProvider {
  readonly id = 'suno';

  isConfigured(): boolean {
    // Keep this provider out of selection until a concrete Suno gateway is
    // implemented. Treating API env vars as "configured" made fallbackChain()
    // choose a provider whose generate() path cannot yet produce audio.
    return false;
  }

  defaultModel(): string {
    return process.env.SUNO_MUSIC_MODEL || 'chirp-v4';
  }

  supportsCoverMode(): boolean {
    return false;
  }

  supportsModelFallback(): boolean {
    return false;
  }

  async generate(_params: MusicGenParams & { model?: string }): Promise<MusicGenResult> {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError(this.id);
    // TODO: implement once gateway is selected. See file header for the
    // outline of the eventual integration. Throwing here keeps the registry
    // safe to wire up — getMusicProvider() filters on isConfigured() before
    // attempting to call.
    throw new ProviderNotConfiguredError(this.id);
  }
}

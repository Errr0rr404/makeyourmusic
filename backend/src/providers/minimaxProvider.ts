import {
  minimaxGenerateMusic,
  MinimaxRateLimitError,
} from '../utils/minimax';
import {
  MusicGenParams,
  MusicGenResult,
  MusicProvider,
  ProviderRateLimitError,
} from './musicProvider';

// MiniMax music generation provider — current default. Keeps the existing
// minimax.ts utility as the lowest-level transport; this wrapper exposes the
// uniform MusicProvider interface so the controller doesn't import minimax
// directly anymore.
export class MiniMaxProvider implements MusicProvider {
  readonly id = 'minimax';

  isConfigured(): boolean {
    return Boolean(process.env.MINIMAX_API_KEY);
  }

  defaultModel(): string {
    return process.env.MINIMAX_MUSIC_MODEL || 'music-2.6';
  }

  supportsCoverMode(): boolean {
    return true;
  }

  supportsModelFallback(): boolean {
    return true;
  }

  async generate(params: MusicGenParams & { model?: string }): Promise<MusicGenResult> {
    try {
      return await minimaxGenerateMusic({
        prompt: params.prompt,
        lyrics: params.lyrics,
        model: params.model || this.defaultModel(),
        isInstrumental: params.isInstrumental,
        audioUrl: params.audioUrl,
        audioBase64: params.audioBase64,
        outputFormat: 'url',
        audioSetting: params.audioSetting,
      });
    } catch (err) {
      if (err instanceof MinimaxRateLimitError) {
        throw new ProviderRateLimitError(this.id, err.code, err.message);
      }
      throw err;
    }
  }
}

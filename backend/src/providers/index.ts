import { MusicProvider } from './musicProvider';
import { MiniMaxProvider } from './minimaxProvider';
import { SunoProvider } from './sunoProvider';
import { StableAudioProvider } from './stableAudioProvider';

const REGISTRY: Record<string, MusicProvider> = {
  minimax: new MiniMaxProvider(),
  suno: new SunoProvider(),
  stableAudio: new StableAudioProvider(),
};

// Return the named provider (raw, even if unconfigured). Use only when the
// caller has already decided which provider to invoke. Most callers should
// use selectProvider() / fallbackChain() instead.
export function getProvider(id: string): MusicProvider | null {
  return REGISTRY[id] || null;
}

export function listConfiguredProviders(): MusicProvider[] {
  return Object.values(REGISTRY).filter((p) => p.isConfigured());
}

// Pick a provider for an outgoing generation. The strategy:
//   1. If the caller pinned a provider via params, return it (when configured).
//   2. Otherwise return the env-configured PRIMARY (default minimax).
//   3. Otherwise the first configured provider, in registry order.
export function selectProvider(opts: {
  preferred?: string | null;
  needsCoverMode?: boolean;
  hasVocals?: boolean;
} = {}): MusicProvider {
  if (opts.preferred) {
    const pinned = REGISTRY[opts.preferred];
    if (pinned?.isConfigured()) return pinned;
  }

  const primaryId = process.env.MUSIC_PROVIDER || 'minimax';
  const primary = REGISTRY[primaryId];
  if (primary?.isConfigured() && providerMatches(primary, opts)) return primary;

  for (const p of Object.values(REGISTRY)) {
    if (p.isConfigured() && providerMatches(p, opts)) return p;
  }

  // Last resort: return the configured primary even if it doesn't match the
  // capability ask — caller will see a clear error rather than a hang.
  if (primary?.isConfigured()) return primary;

  // Worst case: no providers configured. Throwing here is louder than
  // returning a dud and surfaces during boot health checks.
  throw new Error('No music provider configured. Set MINIMAX_API_KEY or another provider key.');
}

// Ordered list to try on retry/fallback. Pulls from MUSIC_PROVIDER_FALLBACKS
// env (comma-separated ids) or defaults to all other configured providers.
export function fallbackChain(primaryId: string): MusicProvider[] {
  const explicit = (process.env.MUSIC_PROVIDER_FALLBACKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = explicit.length
    ? explicit
    : Object.keys(REGISTRY).filter((id) => id !== primaryId);
  return ids
    .map((id) => REGISTRY[id])
    .filter((p): p is MusicProvider => Boolean(p?.isConfigured()));
}

function providerMatches(
  p: MusicProvider,
  opts: { needsCoverMode?: boolean; hasVocals?: boolean }
): boolean {
  if (opts.needsCoverMode && !p.supportsCoverMode()) return false;
  // Stable Audio has no vocals; skip when caller wants vocals.
  if (opts.hasVocals && p.id === 'stableAudio') return false;
  return true;
}

export * from './musicProvider';

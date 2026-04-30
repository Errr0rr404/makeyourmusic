// Defensive slug/token validators used by deep-link entry points.
//
// expo-router types `useLocalSearchParams<{ slug: string }>` as a guaranteed
// string, but at runtime it can be `string | string[] | undefined` if the
// link is malformed (e.g. `mym://track/`). Hitting the API with `undefined`
// or a path-traversal slug like `../foo` produces a confusing "Failed to
// load track" UX. These helpers return `null` on anything that isn't a
// well-formed slug/token so callers can show a clean "invalid link" state.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,200}$/i;
const TOKEN_RE = /^[a-zA-Z0-9_-]{8,256}$/;

export function asSlug(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return SLUG_RE.test(input) ? input : null;
}

export function asToken(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return TOKEN_RE.test(input) ? input : null;
}

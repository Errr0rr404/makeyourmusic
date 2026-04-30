import crypto from 'crypto';

export function slugify(text: string, maxLength = 200): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  // Non-Latin titles strip to empty — return a random fallback so the row
  // isn't stuck with a colliding empty slug.
  if (!slug) return `untitled-${crypto.randomBytes(3).toString('hex')}`;
  return slug;
}

// Random suffix used when a slug already exists. Uses crypto so two rows
// created in the same millisecond don't collide (the previous Date.now()
// suffix did).
export function uniqueSuffix(): string {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Retry-on-P2002 wrapper for create operations whose unique constraint is a
 * slug. Pass a slug seed and a creator that takes the candidate slug; we'll
 * try the seed first, then fall back to seed + random suffix on uniqueness
 * collision. Up to 5 attempts before bubbling the error.
 */
export async function createWithUniqueSlug<T>(
  seed: string,
  create: (candidate: string) => Promise<T>
): Promise<T> {
  let candidate = seed;
  for (let i = 0; i < 5; i++) {
    try {
      return await create(candidate);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        candidate = `${seed}-${uniqueSuffix()}`;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to find unique slug after 5 attempts');
}

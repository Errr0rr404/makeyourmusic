export function slugify(text: string, maxLength = 200): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

export function uniqueSuffix(): string {
  return Date.now().toString(36);
}

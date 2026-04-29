import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export shared utilities for convenience
export { formatDuration, formatCount, slugify, formatDate, truncateText, debounce } from '@makeyourmusic/shared';

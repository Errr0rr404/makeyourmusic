'use client';

import { useTheme } from '@/components/ThemeProvider';

/** Convenience: returns true when the active skin is `vintage`. */
export function useIsVintage() {
  const { skin } = useTheme();
  return skin === 'vintage';
}

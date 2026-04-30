'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Skin = 'modern' | 'vintage';
export type Palette = 'dark' | 'light' | 'system';

const SKIN_KEY = 'mym-skin';
const PALETTE_KEY = 'mym-palette';
// Legacy key from the old single-axis (dark/light/system) provider.
const LEGACY_PALETTE_KEY = 'makeyourmusic-theme';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultSkin?: Skin;
  defaultPalette?: Palette;
  initialSkin?: Skin;
  initialPalette?: Palette;
};

type ThemeProviderState = {
  skin: Skin;
  palette: Palette;
  setSkin: (skin: Skin) => void;
  setPalette: (palette: Palette) => void;
  /** Resolved palette — `system` collapsed to `dark`/`light`. */
  resolvedPalette: 'dark' | 'light';
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

function writeCookie(key: string, value: string) {
  try {
    // 1 year, root path, lax (so SSR sees it on first request).
    document.cookie = `${key}=${value}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* no-op */
  }
}

export function ThemeProvider({
  children,
  defaultSkin = 'modern',
  defaultPalette = 'system',
  initialSkin,
  initialPalette,
}: ThemeProviderProps) {
  const [skin, setSkinState] = useState<Skin>(initialSkin ?? defaultSkin);
  const [palette, setPaletteState] = useState<Palette>(initialPalette ?? defaultPalette);
  const [systemDark, setSystemDark] = useState(true);

  // Hydrate from localStorage on mount (covers cases where SSR didn't have a cookie yet).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedSkin = localStorage.getItem(SKIN_KEY) as Skin | null;
      if (storedSkin === 'modern' || storedSkin === 'vintage') {
        setSkinState(storedSkin);
      }
      const storedPalette =
        (localStorage.getItem(PALETTE_KEY) as Palette | null) ||
        (localStorage.getItem(LEGACY_PALETTE_KEY) as Palette | null);
      if (storedPalette === 'dark' || storedPalette === 'light' || storedPalette === 'system') {
        setPaletteState(storedPalette);
      }
    } catch {
      /* no-op */
    }
  }, []);

  // Track system color scheme so we can resolve `palette === 'system'` reactively.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedPalette: 'dark' | 'light' =
    palette === 'system' ? (systemDark ? 'dark' : 'light') : palette;

  // Apply classes to <html>. Two axes => two class buckets.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('skin-modern', 'skin-vintage');
    root.classList.add(skin === 'vintage' ? 'skin-vintage' : 'skin-modern');
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedPalette);
    root.dataset.skin = skin;
    root.dataset.palette = resolvedPalette;
  }, [skin, resolvedPalette]);

  const setSkin = (next: Skin) => {
    try {
      localStorage.setItem(SKIN_KEY, next);
    } catch {
      /* no-op */
    }
    writeCookie(SKIN_KEY, next);
    setSkinState(next);
  };

  const setPalette = (next: Palette) => {
    try {
      localStorage.setItem(PALETTE_KEY, next);
    } catch {
      /* no-op */
    }
    writeCookie(PALETTE_KEY, next);
    setPaletteState(next);
  };

  return (
    <ThemeProviderContext.Provider
      value={{ skin, palette, setSkin, setPalette, resolvedPalette }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeProviderContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

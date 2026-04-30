import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Skin = 'modern' | 'vintage';
export type Palette = 'dark' | 'light' | 'system';
export type ResolvedPalette = 'dark' | 'light';

export interface ThemeTokens {
  // Surfaces
  bg: string;
  surface: string;
  card: string;
  cardHover: string;
  border: string;
  borderStrong: string;

  // Text
  text: string;
  textSoft: string;
  textMute: string;

  // Brand / accents
  accent: string;
  accentSoft: string;
  brand: string;
  brandStrong: string;
  brandText: string;

  // Vintage-specific physical materials (sensible neutrals on modern)
  metal: string;
  metalShadow: string;
  wood: string;
  woodLight: string;
  paper: string;
  ledOn: string;
  ledAmber: string;
  ledGreen: string;

  // Typography
  fontDisplay: string;
  fontBody: string;
  fontLabel: string;
  fontMono: string;

  // Radii
  radiusLg: number;
  radiusMd: number;
  radiusSm: number;

  // Misc
  isVintage: boolean;
  isDark: boolean;
}

const MODERN_DARK: ThemeTokens = {
  bg: '#0a0a0a',
  surface: '#141414',
  card: '#1a1a1a',
  cardHover: '#222226',
  border: '#2a2a2a',
  borderStrong: '#3a3a3a',
  text: '#fafafa',
  textSoft: 'rgba(250, 250, 250, 0.74)',
  textMute: '#a1a1aa',
  accent: '#8b5cf6',
  accentSoft: 'rgba(139, 92, 246, 0.16)',
  brand: '#d946ef',
  brandStrong: '#c026d3',
  brandText: '#ffffff',
  metal: '#3a3a3a',
  metalShadow: '#1a1a1a',
  wood: '#2b1d10',
  woodLight: '#3e2614',
  paper: '#1a1a1a',
  ledOn: '#d946ef',
  ledAmber: '#ffb347',
  ledGreen: '#5b8a3a',
  fontDisplay: 'System',
  fontBody: 'System',
  fontLabel: 'System',
  fontMono: 'Menlo',
  radiusLg: 14,
  radiusMd: 10,
  radiusSm: 6,
  isVintage: false,
  isDark: true,
};

const MODERN_LIGHT: ThemeTokens = {
  ...MODERN_DARK,
  bg: '#f7f7f8',
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f2f2f4',
  border: '#e5e5ea',
  borderStrong: '#d1d1d6',
  text: '#0d0d11',
  textSoft: 'rgba(13, 13, 17, 0.74)',
  textMute: '#71717a',
  paper: '#ffffff',
  isDark: false,
};

// Mobile uses platform fallbacks for vintage typography until we ship
// expo-google-fonts (Anton/Plex/SpecialElite/VT323). The fallbacks chosen here
// are bundled with iOS and (mostly) Android, so they give the right vibe
// without any font-loading work:
//   - Impact-style: 'Impact' (iOS, Android — though Android lacks a true match)
//   - Typewriter:   'AmericanTypewriter' on iOS, 'monospace' on Android
//   - Mono LED:     'Courier' on iOS, 'monospace' on Android
const FONT_DISPLAY = 'Impact';
const FONT_LABEL = 'AmericanTypewriter';
const FONT_MONO = 'Courier';

const VINTAGE_NIGHT: ThemeTokens = {
  bg: '#15110b',
  surface: '#231a10',
  card: '#2e2316',
  cardHover: '#3a2c19',
  border: 'rgba(243, 231, 201, 0.12)',
  borderStrong: 'rgba(243, 231, 201, 0.25)',
  text: '#f3e7c9',
  textSoft: 'rgba(243, 231, 201, 0.78)',
  textMute: 'rgba(243, 231, 201, 0.55)',
  accent: '#ffb347',
  accentSoft: 'rgba(255, 179, 71, 0.18)',
  brand: '#e85a3c',
  brandStrong: '#c0392b',
  brandText: '#ffffff',
  metal: '#5a564f',
  metalShadow: '#2a2620',
  wood: '#3e2614',
  woodLight: '#6b4423',
  paper: '#3a2c19',
  ledOn: '#ff5a3c',
  ledAmber: '#ffb347',
  ledGreen: '#5b8a3a',
  fontDisplay: FONT_DISPLAY,
  fontBody: 'System',
  fontLabel: FONT_LABEL,
  fontMono: FONT_MONO,
  radiusLg: 6,
  radiusMd: 4,
  radiusSm: 2,
  isVintage: true,
  isDark: true,
};

const VINTAGE_DAY: ThemeTokens = {
  ...VINTAGE_NIGHT,
  bg: '#f3e7c9',
  surface: '#ebdcb3',
  card: '#dcc999',
  cardHover: '#c8b48a',
  border: 'rgba(43, 29, 16, 0.16)',
  borderStrong: 'rgba(43, 29, 16, 0.32)',
  text: '#2b1d10',
  textSoft: 'rgba(43, 29, 16, 0.78)',
  textMute: 'rgba(43, 29, 16, 0.55)',
  accent: '#d97a2a',
  accentSoft: 'rgba(192, 57, 43, 0.14)',
  brand: '#c0392b',
  brandStrong: '#9b2818',
  metal: '#b9b3a8',
  metalShadow: '#7a7468',
  paper: '#fbf3df',
  ledOn: '#ff5a3c',
  ledAmber: '#d97a2a',
  isDark: false,
};

function pickTokens(skin: Skin, resolved: ResolvedPalette): ThemeTokens {
  if (skin === 'vintage') return resolved === 'dark' ? VINTAGE_NIGHT : VINTAGE_DAY;
  return resolved === 'dark' ? MODERN_DARK : MODERN_LIGHT;
}

const SKIN_KEY = 'mym-skin';
const PALETTE_KEY = 'mym-palette';

interface ThemeContextValue {
  skin: Skin;
  palette: Palette;
  resolvedPalette: ResolvedPalette;
  tokens: ThemeTokens;
  setSkin: (skin: Skin) => void;
  setPalette: (palette: Palette) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveSystem(scheme: ColorSchemeName | null | undefined): ResolvedPalette {
  return scheme === 'light' ? 'light' : 'dark';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [skin, setSkinState] = useState<Skin>('modern');
  const [palette, setPaletteState] = useState<Palette>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(
    Appearance.getColorScheme(),
  );

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    void (async () => {
      try {
        const [s, p] = await Promise.all([
          AsyncStorage.getItem(SKIN_KEY),
          AsyncStorage.getItem(PALETTE_KEY),
        ]);
        if (s === 'modern' || s === 'vintage') setSkinState(s);
        if (p === 'dark' || p === 'light' || p === 'system') setPaletteState(p);
      } catch {
        // Storage unavailable — keep defaults.
      }
    })();
  }, []);

  // React to OS appearance changes.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const resolvedPalette: ResolvedPalette =
    palette === 'system' ? resolveSystem(systemScheme) : palette;

  const tokens = useMemo(() => pickTokens(skin, resolvedPalette), [skin, resolvedPalette]);

  const setSkin = (next: Skin) => {
    setSkinState(next);
    void AsyncStorage.setItem(SKIN_KEY, next).catch(() => undefined);
  };

  const setPalette = (next: Palette) => {
    setPaletteState(next);
    void AsyncStorage.setItem(PALETTE_KEY, next).catch(() => undefined);
  };

  const value: ThemeContextValue = {
    skin,
    palette,
    resolvedPalette,
    tokens,
    setSkin,
    setPalette,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export function useTokens(): ThemeTokens {
  return useTheme().tokens;
}

export function useIsVintage(): boolean {
  return useTheme().skin === 'vintage';
}

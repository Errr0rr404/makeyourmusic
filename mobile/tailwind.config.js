/** @type {import('tailwindcss').Config} */
//
// NativeWind colors. The `mym-*` palette consumes runtime CSS variables that
// the ThemeProvider sets on the root view via the `vars()` API — that means
// classes like `bg-mym-surface` automatically follow whichever skin/palette
// the user picks (modern dark, modern light, vintage night, vintage day).
//
// Static fallbacks here match the modern-dark palette so anything that
// renders before the provider mounts (e.g. the splash screen) is sane.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        mym: {
          bg: 'var(--mym-bg, #0a0a0a)',
          surface: 'var(--mym-surface, #141414)',
          card: 'var(--mym-card, #1a1a1a)',
          border: 'var(--mym-border, #2a2a2a)',
          accent: 'var(--mym-accent, #8b5cf6)',
          'accent-hover': 'var(--mym-accent-hover, #7c3aed)',
          muted: 'var(--mym-muted, #a1a1aa)',
          text: 'var(--mym-text, #fafafa)',
        },
      },
    },
  },
  plugins: [],
};

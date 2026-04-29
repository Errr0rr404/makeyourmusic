/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        mym: {
          bg: '#0a0a0a',
          surface: '#141414',
          card: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#8b5cf6',
          'accent-hover': '#7c3aed',
          muted: '#a1a1aa',
          text: '#fafafa',
        },
      },
    },
  },
  plugins: [],
};
